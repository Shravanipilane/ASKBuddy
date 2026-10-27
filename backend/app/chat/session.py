import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass, field

from app.utils import config


@dataclass
class Session:
    id: str
    name: str | None = None
    history: deque = field(default_factory=lambda: deque(maxlen=config.HISTORY_TURNS * 2))
    last_topic: str | None = None
    awaiting_quiz: bool = False
    last_seen: float = field(default_factory=time.time)


_sessions: dict[str, Session] = {}
_lock = threading.Lock()


def _purge(now: float) -> None:
    ttl = config.SESSION_TTL_MINUTES * 60
    for sid in [k for k, v in _sessions.items() if now - v.last_seen > ttl]:
        del _sessions[sid]


def get_session(session_id: str | None = None) -> Session:
    """Returns the session for this id, or a new one if the id is missing or expired."""
    now = time.time()
    with _lock:
        _purge(now)
        session = _sessions.get(session_id) if session_id else None
        if session is None:
            if len(_sessions) >= config.SESSION_MAX:
                oldest = min(_sessions.values(), key=lambda s: s.last_seen)
                del _sessions[oldest.id]
            session = Session(id=uuid.uuid4().hex)
            _sessions[session.id] = session
        session.last_seen = now
        return session


def clear_all() -> None:
    with _lock:
        _sessions.clear()