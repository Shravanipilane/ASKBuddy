"""Decides what kind of message this is, using simple rules (no LLM call)."""
import re
from dataclasses import dataclass


@dataclass
class Decision:
    route: str                # empty | greeting | about | thanks | bye | need_topic | study
    mode: str = "normal"      # normal | example | simpler | more | quiz
    followup: bool = False


_GREET_WORD = re.compile(r"^(h+i+|h+e+y+|hell+o+|hola|namaste|yo|sup)$")
_GREET_FILLER = {
    "there", "buddy", "askbuddy", "good", "morning", "afternoon", "evening",
    "everyone", "sir", "mam", "maam", "friend", "guys",
}
_ABOUT = re.compile(r"\b(how are you|who are you|what can you do|what are you|your name)\b")
_THANKS = re.compile(r"\b(thanks|thank|thx|thankyou|tysm)\b")
_BYE = re.compile(r"\b(bye|goodbye|see you|see ya|good night)\b")
_QUESTION_HINT = re.compile(
    r"\b(what|why|how|when|where|which|who|explain|define|describe|difference|meaning)\b"
)

_QUIZ = re.compile(r"\b(quiz|test me|ask me (a |some )?questions?)\b")
_EXAMPLE = re.compile(
    r"\b(another|one more|different|other|more)\b.*\b(examples?|analog(y|ies))\b"
    r"|\bgive (me )?(an? )?(example|analogy)\b|\bexample please\b"
)
_SIMPLER = re.compile(
    r"\b(simpler|simply|easier|easy way|differently|again)\b"
    r"|\bi (didn'?t|don'?t|do not|did not) (get|understand)\b"
    r"|\btoo (hard|difficult|confusing)\b|\bnot clear\b"
)
_MORE = re.compile(
    r"^(more|tell me more|go on|continue|elaborate|explain more|in detail|more details?)$"
)


def _normalize(text: str) -> str:
    t = re.sub(r"[^\w\s']", " ", text.lower())
    return re.sub(r"\s+", " ", t).strip()


def _is_greeting(words: list[str]) -> bool:
    if not words or len(words) > 5:
        return False
    has_greet = any(_GREET_WORD.match(w) for w in words) or words[0] == "good"
    return has_greet and all(_GREET_WORD.match(w) or w in _GREET_FILLER for w in words)


def _followup_mode(t: str, words: list[str]) -> str | None:
    if len(words) > 10:
        return None
    if _QUIZ.search(t):
        return "quiz"
    if _EXAMPLE.search(t):
        return "example"
    if _MORE.match(t):
        return "more"
    if len(words) <= 8 and _SIMPLER.search(t):
        return "simpler"
    return None


def classify(text: str, has_topic: bool) -> Decision:
    t = _normalize(text)
    words = t.split()
    if not words:
        return Decision("empty")
    if _is_greeting(words):
        return Decision("greeting")
    if len(words) <= 7 and _ABOUT.search(t):
        return Decision("about")
    has_question = "?" in text or bool(_QUESTION_HINT.search(t))
    if len(words) <= 6 and not has_question:
        if _BYE.search(t):
            return Decision("bye")
        if _THANKS.search(t):
            return Decision("thanks")
    mode = _followup_mode(t, words)
    if mode:
        if not has_topic:
            return Decision("need_topic")
        return Decision("study", mode=mode, followup=True)
    return Decision("study")