"""One function the whole app uses: chat_turn().

message in -> route -> (retrieve + friendly answer) -> response object out.
The API, the terminal chat and any future frontend all call this.
"""
import logging

from app.chat import rag_adapter as rag
from app.chat.persona import (GENERAL_HINTS, GENERAL_NOTICE, GENERAL_PROMPT, MODE_HINTS, PROMPT,
                              canned, parse_reply)
from app.chat.router import classify
from app.chat.session import Session, get_session
from app.utils import config

log = logging.getLogger("askbuddy.chat")


def _shown_page(meta: dict):
    """Page printed in the real book, or the PDF page if that is unknown."""
    return meta.get("book_page") or meta.get("page") or "?"


def _label(meta: dict) -> str:
    """'Physics Part 2' for books with parts, 'Biology' otherwise."""
    part = f" Part {meta['part']}" if meta.get("part") else ""
    return f"{meta.get('subject', '')}{part}"



def _build(session: Session, route: str, book: str, fun: str = "", nxt: str = "",
           mood: str = "happy", sources: list | None = None, mode: str = "normal") -> dict:
    pieces = [p for p in (book, fun, nxt) if p]
    return {
        "session_id": session.id,
        "route": route,
        "mode": mode,
        "book_answer": book,
        "fun_extra": fun,
        "next_prompt": nxt,
        "text": "\n\n".join(pieces),
        "spoken_text": " ".join(pieces),
        "mood": mood,
        "sources": sources or [],
    }



def _canned_reply(session: Session, route: str, kind: str, user_text: str) -> dict:
    text, mood = canned(kind, session.name)
    session.history.append(("Student", user_text))
    session.history.append(("ASKBuddy", text))
    return _build(session, route, text, mood=mood)


def _history_text(session: Session) -> str:
    if not session.history:
        return "(none)"
    return "\n".join(f"{who}: {txt[:400]}" for who, txt in session.history)


def _sources(hits: list[dict]) -> list[dict]:
    best: dict = {}
    for h in hits:
        m = h["meta"]
        key = (m.get("book", ""), m.get("subject"), m.get("std"), m.get("part"), m.get("chapter"), m.get("page"))
        if key not in best or h["score"] > best[key]["score"]:
            best[key] = {
                "subject": m.get("subject"), "label": _label(m), "std": m.get("std"),
                "part": m.get("part") or 0, "chapter": m.get("chapter"),
                "page": _shown_page(m),            # page printed in the book
                "pdf_page": m.get("page"),         # page inside the PDF file
                "score": h["score"],
            }
    return sorted(best.values(), key=lambda s: -s["score"])


def _failure_kind(error: Exception) -> str:
    """'busy' when Gemini is overloaded or rate-limited, otherwise 'error'."""
    busy = any(w in str(error) for w in ("503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "overloaded"))
    return "busy" if busy else "error"


def _remember(session: Session, text: str, parsed: dict, mode: str, followup: bool) -> None:
    if not followup and mode == "normal":
        session.last_topic = text
    session.awaiting_quiz = mode == "quiz"
    session.last_next = parsed["next"]
    session.history.append(("Student", text))
    session.history.append(("ASKBuddy", " ".join(p for p in (parsed["book"], parsed["fun"], parsed["next"]) if p)))


def _general_reply(session: Session, text: str, mode: str, followup: bool) -> dict:
    """The chapter has no good match: answer from Gemini's general knowledge, clearly labelled."""
    prompt = GENERAL_PROMPT.format(mode_hint=GENERAL_HINTS[mode], history=_history_text(session), question=text)
    try:
        raw = rag.llm(prompt)
    except Exception as e:
        log.exception("LLM call failed")
        kind = _failure_kind(e)
        return _canned_reply(session, kind, kind, text)
    parsed = parse_reply(raw)
    parsed["book"] = f"{GENERAL_NOTICE} {parsed['book']}"
    _remember(session, text, parsed, mode, followup)
    return _build(session, "general", parsed["book"], parsed["fun"], parsed["next"], parsed["mood"], [], mode)


def chat_turn(message: str, session_id: str | None = None,
              scope: dict | None = None, name: str | None = None) -> dict:
    """scope = {"subject": "Physics", "std": 11, "part": 2, "chapter": 1}; every key is optional."""
    session = get_session(session_id)
    if name and name.strip():
        session.name = name.strip()[:40]

    text = (message or "").strip()[: config.MAX_QUESTION_CHARS]
    decision = classify(text, has_topic=bool(session.last_topic))

    if decision.route == "empty":
        return _canned_reply(session, "empty", "empty", text)
    if decision.route in ("greeting", "about", "thanks", "bye", "declined", "need_topic"):
        return _canned_reply(session, decision.route, decision.route, text)

    # ---- study question ----
    mode = decision.mode
    if session.awaiting_quiz and not decision.followup and "?" not in text:
        mode = "check"          # the student is answering the quiz

    if mode == "yes" and session.last_next:
        query = f"{session.last_topic} {session.last_next}"     # find the passages for what was offered
    elif decision.followup or mode == "check":
        query = session.last_topic
    else:
        query = text

    hits, retrieval_failed = [], False
    try:
        hits = rag.search(query, scope)
    except Exception:
        log.exception("Retrieval failed")
        retrieval_failed = True

    if retrieval_failed and not config.ALLOW_GENERAL_ANSWERS:
        return _canned_reply(session, "error", "error", text)
    if retrieval_failed or not rag.good_enough(hits):
        if config.ALLOW_GENERAL_ANSWERS:
            return _general_reply(session, text, mode, decision.followup)
        return _canned_reply(session, "not_found", "not_found", text)

    context = "\n\n".join(
        f"[{_label(h['meta'])}, Chapter {h['meta'].get('chapter', '?')}, Page {_shown_page(h['meta'])}] {h['text']}"
        for h in hits
    )
    prompt = PROMPT.format(
        mode_hint=MODE_HINTS[mode],
        history=_history_text(session),
        context=context,
        question=text,
    )

    try:
        raw = rag.llm(prompt)
    except Exception as e:
        log.exception("LLM call failed")
        kind = _failure_kind(e)
        return _canned_reply(session, kind, kind, text)

    parsed = parse_reply(raw)
    _remember(session, text, parsed, mode, decision.followup)

    return _build(
        session, "study", parsed["book"], parsed["fun"], parsed["next"],
        parsed["mood"], _sources(hits), mode,
    )