"""Tests for the chat brain, QR resolver and TTS helpers.

They need no models, no internet and no ChromaDB data.
Run from the backend folder:   python -m pytest tests -q
"""
import json

import numpy as np
import pytest

from app.chat import pipeline, rag_adapter
from app.chat.persona import parse_reply
from app.chat.router import classify
from app.chat.session import clear_all
from app.qr_resolver import resolver
from app.utils import config
from app.voice import tts


# ---------------- router ----------------

@pytest.mark.parametrize("text", ["hi", "hii", "Hello!", "hey there", "good morning", "namaste buddy"])
def test_greetings(text):
    assert classify(text, has_topic=False).route == "greeting"


def test_greeting_word_plus_question_is_a_study_question():
    assert classify("hi what is mitosis", has_topic=False).route == "study"


def test_about_thanks_bye():
    assert classify("how are you", False).route == "about"
    assert classify("thank you so much", False).route == "thanks"
    assert classify("bye", False).route == "bye"


def test_thanks_with_a_question_is_still_a_question():
    assert classify("thanks, what is osmosis", False).route == "study"


def test_followups_need_a_topic():
    assert classify("give me another example", False).route == "need_topic"
    d = classify("give me another example", True)
    assert (d.route, d.mode, d.followup) == ("study", "example", True)
    assert classify("quiz me", True).mode == "quiz"
    assert classify("explain again", True).mode == "simpler"
    assert classify("tell me more", True).mode == "more"


def test_normal_question_is_study():
    d = classify("What is photosynthesis?", True)
    assert (d.route, d.mode, d.followup) == ("study", "normal", False)


def test_empty():
    assert classify("   ", False).route == "empty"


# ---------------- reply parsing ----------------

def test_parse_reply_full():
    raw = "BOOK: Animalia is the top group (p. 8).\nFUN: Like a school.\nNEXT: Want a quiz?\nMOOD: excited"
    p = parse_reply(raw)
    assert p == {"book": "Animalia is the top group (p. 8).", "fun": "Like a school.",
                 "next": "Want a quiz?", "mood": "excited"}


def test_parse_reply_without_tags_falls_back_to_book():
    p = parse_reply("Just a plain answer.")
    assert p["book"] == "Just a plain answer." and p["fun"] == "" and p["mood"] == "happy"


def test_parse_reply_bad_mood_and_markdown():
    p = parse_reply("BOOK: **Bold** text\nFUN:\nNEXT: ok\nMOOD: furious")
    assert p["book"] == "Bold text" and p["fun"] == "" and p["mood"] == "happy"


# ---------------- pipeline (RAG and LLM are faked) ----------------

HIT = {"text": "Kingdom Animalia is the highest category.", "meta": {
    "subject": "Biology", "std": 11, "chapter": 1, "page": 8}, "score": 0.7}
LLM_OUT = "BOOK: Animalia is the top group (p. 8).\nFUN: Like a school.\nNEXT: Want another example?\nMOOD: happy"


@pytest.fixture
def fake_rag(monkeypatch):
    clear_all()
    calls = {"queries": [], "prompts": []}

    def search(query, scope):
        calls["queries"].append(query)
        return [HIT]

    def llm(prompt):
        calls["prompts"].append(prompt)
        return LLM_OUT

    monkeypatch.setattr(rag_adapter, "search", search)
    monkeypatch.setattr(rag_adapter, "good_enough", lambda hits: bool(hits) and hits[0]["score"] >= 0.55)
    monkeypatch.setattr(rag_adapter, "llm", llm)
    return calls


def test_greeting_makes_no_rag_or_llm_call(fake_rag):
    r = pipeline.chat_turn("hi", name="Asha")
    assert r["route"] == "greeting" and "Asha" in r["text"]
    assert fake_rag["queries"] == [] and fake_rag["prompts"] == []


def test_study_question_response_shape(fake_rag):
    r = pipeline.chat_turn("What is animal kingdom?", scope={"subject": "Biology", "std": 11, "chapter": 1})
    assert r["route"] == "study"
    assert r["book_answer"].startswith("Animalia")
    assert r["fun_extra"] == "Like a school."
    assert r["sources"][0]["page"] == 8
    assert "Like a school." in r["spoken_text"] and r["mood"] == "happy"
    assert len(fake_rag["prompts"]) == 1


def test_followup_searches_with_the_last_topic_and_keeps_session(fake_rag):
    first = pipeline.chat_turn("What is animal kingdom?")
    second = pipeline.chat_turn("give me another example", session_id=first["session_id"])
    assert second["session_id"] == first["session_id"]
    assert fake_rag["queries"] == ["What is animal kingdom?", "What is animal kingdom?"]
    assert "NEW fun analogy" in fake_rag["prompts"][1]
    assert "Student: What is animal kingdom?" in fake_rag["prompts"][1]


def test_followup_without_topic_asks_for_a_question_first(fake_rag):
    r = pipeline.chat_turn("quiz me")
    assert r["route"] == "need_topic" and fake_rag["prompts"] == []


def test_quiz_then_answer_is_checked(fake_rag):
    first = pipeline.chat_turn("What is animal kingdom?")
    sid = first["session_id"]
    pipeline.chat_turn("quiz me", session_id=sid)
    pipeline.chat_turn("it is the biggest group of animals", session_id=sid)
    assert "answering the quiz" in fake_rag["prompts"][-1]


def test_low_score_gives_friendly_not_found(fake_rag, monkeypatch):
    monkeypatch.setattr(rag_adapter, "search", lambda q, s: [{**HIT, "score": 0.1}])
    r = pipeline.chat_turn("who won the cricket match")
    assert r["route"] == "not_found" and r["sources"] == []


def test_llm_failure_gives_friendly_error(fake_rag, monkeypatch):
    def boom(prompt):
        raise RuntimeError("quota")
    monkeypatch.setattr(rag_adapter, "llm", boom)
    assert pipeline.chat_turn("What is osmosis?")["route"] == "error"


# ---------------- QR resolver ----------------

@pytest.fixture
def registry(tmp_path, monkeypatch):
    path = tmp_path / "qr.json"
    path.write_text(json.dumps({
        "_readme": "ignored",
        "kebo101": {"subject": "Biology", "std": 11, "chapter": 1, "title": "The Living World"},
        "ncert.nic.in/textbook.php?kebo1=1-19": {"subject": "Biology", "std": 11, "chapter": 1},
    }))
    monkeypatch.setattr(config, "QR_REGISTRY_PATH", path)
    resolver._cache.update(mtime=None, data={})
    return path


def test_resolver_simple_code_format(registry):
    r = resolver.resolve("bio11-ch3")
    assert (r["subject"], r["std"], r["chapter"]) == ("Biology", 11, 3)


def test_resolver_registry_by_pdf_name_in_link(registry):
    r = resolver.resolve("https://ncert.nic.in/textbook/pdf/kebo101.pdf")
    assert r["chapter"] == 1 and r["title"] == "The Living World"


def test_resolver_registry_by_full_link(registry):
    assert resolver.resolve("https://www.ncert.nic.in/textbook.php?kebo1=1-19/")["subject"] == "Biology"


def test_resolver_unknown_and_empty(registry):
    assert resolver.resolve("https://example.com/whatever") is None
    assert resolver.resolve("   ") is None


# ---------------- TTS helpers ----------------

def test_clean_text_removes_page_refs_and_markdown():
    out = tts.clean_text("**Animalia** is the top group (p. 8). See [Page 4] and (pp. 4-5) now.")
    assert "(p." not in out and "[Page" not in out and "*" not in out and "pp." not in out


def test_clean_text_cuts_at_a_sentence_end(monkeypatch):
    monkeypatch.setattr(config, "TTS_MAX_CHARS", 60)
    out = tts.clean_text("First sentence is here. Second sentence is longer than the limit allows.")
    assert out == "First sentence is here."


def test_speak_returns_word_timings(monkeypatch):
    class Fake:
        def synth(self, text):
            return np.zeros(config.TTS_SAMPLE_RATE, dtype=np.float32)   # 1 second per piece

    monkeypatch.setattr(tts, "_engine", Fake())
    r = tts.speak("Hello there. This is a test.")
    assert r["words"] == ["Hello", "there.", "This", "is", "a", "test."]
    assert r["wtimes"] == sorted(r["wtimes"])
    assert len(r["words"]) == len(r["wtimes"]) == len(r["wdurations"])
    assert 1000 < r["duration_ms"] < 1300      # both sentences fit in one 1-second piece
    payload = tts.speak_payload("Hello there.")
    assert payload["mime"] == "audio/wav" and payload["audio_base64"]