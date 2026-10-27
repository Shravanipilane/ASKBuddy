"""One function the whole app uses: chat_turn().

message in -> route -> (retrieve + friendly answer) -> response object out.
The API, the terminal chat and any future frontend all call this.
"""
import logging

from app.chat import rag_adapter as rag
from app.chat.persona import MODE_HINTS, PROMPT, canned, parse_reply
from app.chat.router import classify
from app.chat.session import Session, get_session
from app.utils import config

log = logging.getLogger("askbuddy.chat")


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
        "text": "\n\n".join(pieces),        # for display
        "spoken_text": " ".join(pieces),    # send this to /voice/speak
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
        key = (m.get("subject"), m.get("std"), m.get("chapter"), m.get("page"))
        if key not in best or h["score"] > best[key]["score"]:
            best[key] = {
                "subject": m.get("subject"), "std": m.get("std"),
                "chapter": m.get("chapter"), "page": m.get("page"),
                "score": h["score"],
            }
    return sorted(best.values(), key=lambda s: -s["score"])


def chat_turn(message: str, session_id: str | None = None,
              scope: dict | None = None, name: str | None = None) -> dict:
    """scope = {"subject": "Biology", "std": 11, "chapter": 1}; every key is optional."""
    session = get_session(session_id)
    if name and name.strip():
        session.name = name.strip()[:40]

    text = (message or "").strip()[: config.MAX_QUESTION_CHARS]
    decision = classify(text, has_topic=bool(session.last_topic))

    if decision.route == "empty":
        return _canned_reply(session, "empty", "empty", text)
    if decision.route in ("greeting", "about", "thanks", "bye", "need_topic"):
        return _canned_reply(session, decision.route, decision.route, text)

    # ---- study question ----
    mode = decision.mode
    if session.awaiting_quiz and not decision.followup and "?" not in text:
        mode = "check"          # the student is answering the quiz

    query = session.last_topic if (decision.followup or mode == "check") else text

    try:
        hits = rag.search(query, scope)
    except Exception:
        log.exception("Retrieval failed")
        return _canned_reply(session, "error", "error", text)

    if not rag.good_enough(hits):
        return _canned_reply(session, "not_found", "not_found", text)

    context = "\n\n".join(f"[Page {h['meta'].get('page', '?')}] {h['text']}" for h in hits)
    prompt = PROMPT.format(
        mode_hint=MODE_HINTS[mode],
        history=_history_text(session),
        context=context,
        question=text,
    )

    try:
        raw = rag.llm(prompt)
    except Exception:
        log.exception("LLM call failed")
        return _canned_reply(session, "error", "error", text)

    parsed = parse_reply(raw)

    if not decision.followup and mode == "normal":
        session.last_topic = text
    session.awaiting_quiz = mode == "quiz"
    session.history.append(("Student", text))
    session.history.append(("ASKBuddy", " ".join(p for p in (parsed["book"], parsed["fun"]) if p)))

    return _build(
        session, "study", parsed["book"], parsed["fun"], parsed["next"],
        parsed["mood"], _sources(hits), mode,
    )