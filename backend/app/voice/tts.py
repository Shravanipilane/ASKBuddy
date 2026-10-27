import base64
import io
import re
import threading
import wave

import numpy as np

from app.utils import config

_engine = None
_lock = threading.Lock()


# ---------- 1. Clean the text so the voice does not read symbols ----------

def clean_text(text: str) -> str:
    text = re.sub(r"\[Page \d+\]", " ", text)                                         # [Page 4]
    text = re.sub(r"\((?:see\s+)?pp?\.\s*[\d\s,\-–and]+\)", " ", text, flags=re.I)     # (p. 4) (pp. 4-5)
    text = re.sub(r"https?://\S+", " ", text)                                         # links
    text = re.sub(r"[*_`#>]+", " ", text)                                             # markdown
    text = re.sub(r"^\s*[-•]\s+", "", text, flags=re.M)                               # bullet marks
    text = re.sub(r"\s+", " ", text).strip()

    limit = config.TTS_MAX_CHARS
    if len(text) > limit:
        cut = text[:limit]
        end = max(cut.rfind(". "), cut.rfind("! "), cut.rfind("? "))
        text = cut[: end + 1] if end > limit // 3 else cut     # stop at a sentence end
    return text


# ---------- 2. Split into short pieces (small models do better) ----------

def split_chunks(text: str, max_chars: int | None = None) -> list[str]:
    max_chars = max_chars or config.TTS_CHUNK_CHARS
    sentences = re.split(r"(?<=[.!?])\s+", text)
    chunks, cur = [], ""
    for s in sentences:
        if cur and len(cur) + len(s) + 1 > max_chars:
            chunks.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    if cur:
        chunks.append(cur)
    return chunks


# ---------- 3. Engines (add another class here for Hindi later) ----------

class _KittenEngine:
    def __init__(self):
        from kittentts import KittenTTS
        self.model = KittenTTS(config.TTS_MODEL)

    def synth(self, text: str) -> np.ndarray:
        audio = self.model.generate(text, voice=config.TTS_VOICE, speed=config.TTS_SPEED)
        return np.asarray(audio, dtype=np.float32).flatten()


_ENGINES = {"kitten": _KittenEngine}


def _get_engine():
    """Loads the TTS model once, on first use."""
    global _engine
    if _engine is None:
        with _lock:
            if _engine is None:
                if config.TTS_ENGINE not in _ENGINES:
                    raise ValueError(f"Unknown TTS_ENGINE '{config.TTS_ENGINE}'. Options: {list(_ENGINES)}")
                _engine = _ENGINES[config.TTS_ENGINE]()
    return _engine


def warm_up() -> None:
    _get_engine()


# ---------- 4. Word timings (for lip-sync later) ----------

def _spread_words(chunk: str, start_s: float, dur_s: float, words, wtimes, wdurs) -> None:
    """Estimates when each word is spoken: the chunk's duration is shared by word length."""
    tokens = chunk.split()
    if not tokens:
        return
    weights = [len(w) + 1 for w in tokens]
    total = sum(weights)
    t = start_s
    for w, weight in zip(tokens, weights):
        d = dur_s * weight / total
        words.append(w)
        wtimes.append(round(t * 1000))
        wdurs.append(round(d * 1000))
        t += d


# ---------- 5. Public functions ----------

def speak(text: str) -> dict:
    """text in -> audio out.

    Returns {"audio": float32 array, "sample_rate": int, "duration_ms": int,
             "words": [...], "wtimes": [ms...], "wdurations": [ms...]}
    """
    cleaned = clean_text(text)
    if not cleaned:
        raise ValueError("Nothing to speak.")

    engine = _get_engine()
    sr = config.TTS_SAMPLE_RATE
    gap = np.zeros(int(sr * 0.15), dtype=np.float32)       # short pause between pieces
    parts, words, wtimes, wdurs = [], [], [], []
    cursor = 0.0
    for chunk in split_chunks(cleaned):
        audio = engine.synth(chunk)
        dur = len(audio) / sr
        _spread_words(chunk, cursor, dur, words, wtimes, wdurs)
        parts.append(audio)
        parts.append(gap)
        cursor += dur + len(gap) / sr

    return {
        "audio": np.concatenate(parts),
        "sample_rate": sr,
        "duration_ms": round(cursor * 1000),
        "words": words,
        "wtimes": wtimes,
        "wdurations": wdurs,
    }


def to_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def speak_wav(text: str) -> bytes:
    result = speak(text)
    return to_wav_bytes(result["audio"], result["sample_rate"])


def speak_payload(text: str) -> dict:
    """JSON-friendly version for the web: base64 WAV plus word timings."""
    r = speak(text)
    wav = to_wav_bytes(r["audio"], r["sample_rate"])
    return {
        "audio_base64": base64.b64encode(wav).decode("ascii"),
        "mime": "audio/wav",
        "sample_rate": r["sample_rate"],
        "duration_ms": r["duration_ms"],
        "words": r["words"],
        "wtimes": r["wtimes"],
        "wdurations": r["wdurations"],
    }