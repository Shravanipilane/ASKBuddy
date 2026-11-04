import base64
import io
import re
import threading
import wave
import time
from collections import OrderedDict

import numpy as np

from app.utils import config

_engine = None
_lock = threading.Lock()

# NEW: speed helpers
_gen_lock = threading.Lock()      # one speech job at a time, so jobs don't slow each other down
_cache_lock = threading.Lock()
_CACHE: "OrderedDict[tuple, dict]" = OrderedDict()
_CACHE_MAX = 20                   # remembers the last 20 answers (about a few MB)


# ---------- 1. Clean the text so the voice does not read symbols ----------

# NEW: "Would you like to hear more?" type endings are not worth 10 seconds of speech
_OFFER = re.compile(
    r"^(would you like|do you want|want to|shall i|should i|can i|let me know|feel free)",
    re.I,
)


def _drop_follow_up(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    if len(sentences) > 1 and sentences[-1].endswith("?") and _OFFER.match(sentences[-1]):
        sentences = sentences[:-1]
    return " ".join(sentences)


def clean_text(text: str) -> str:
    text = re.sub(r"\[Page \d+\]", " ", text)                                         # [Page 4]
    text = re.sub(r"\((?:see\s+)?pp?\.\s*[\d\s,\-–and]+\)", " ", text, flags=re.I)     # (p. 4) (pp. 4-5)
    text = re.sub(r"https?://\S+", " ", text)                                         # links
    text = re.sub(r"[*_`#>]+", " ", text)                                             # markdown
    text = re.sub(r"^\s*[-•]\s+", "", text, flags=re.M)                               # bullet marks
    text = re.sub(r"\s+", " ", text).strip()
    text = _drop_follow_up(text)                                                      # NEW

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


def _stream_chunks(cleaned: str) -> list[str]:
    """NEW: the FIRST chunk is short (about one phrase), so the first sound arrives sooner."""
    limit = getattr(config, "TTS_FIRST_CHARS", 100)
    sentences = re.split(r"(?<=[.!?])\s+", cleaned)
    first = sentences[0]
    rest_sentences = sentences[1:]

    if len(first) > limit:
        cut = max(first.rfind(", ", 0, limit), first.rfind(": ", 0, limit), first.rfind("; ", 0, limit))
        if cut < 30:
            cut = first.rfind(" ", 0, limit)
        if cut >= 30:
            rest_sentences = [first[cut + 1:].strip()] + rest_sentences
            first = first[: cut + 1].strip()

    rest = " ".join(rest_sentences)
    return [first] + (split_chunks(rest) if rest else [])


# ---------- 3. Engines (add another class here for Hindi later) ----------

class _KittenEngine:
    def __init__(self):
        from kittentts import KittenTTS
        self.model = KittenTTS(config.TTS_MODEL)

    def synth(self, text):
        start = time.perf_counter()

        audio = self.model.generate(
            text,
            voice=config.TTS_VOICE,
            speed=config.TTS_SPEED
        )

        print(
            f"TTS inference time: "
            f"{time.perf_counter() - start:.2f} seconds"
        )

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
    """Runs the voice twice at server start, so the FIRST real question is already fast."""
    started = time.perf_counter()
    engine = _get_engine()
    engine.synth("Hello! Welcome to ASKBuddy.")
    engine.synth("Here is a longer sentence, so the first real question is fast too.")
    print(f"TTS warm-up finished in {time.perf_counter() - started:.1f} seconds. Voice is ready.")


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
    start = time.perf_counter()

    cleaned = clean_text(text)
    if not cleaned:
        raise ValueError("Nothing to speak.")

    engine = _get_engine()
    sr = config.TTS_SAMPLE_RATE

    gap = np.zeros(int(sr * 0.05), dtype=np.float32)

    parts, words, wtimes, wdurs = [], [], [], []
    cursor = 0.0

    chunks = split_chunks(cleaned)

    for i, chunk in enumerate(chunks):
        chunk_start = time.perf_counter()

        audio = engine.synth(chunk)

        chunk_time = time.perf_counter() - chunk_start
        print(f"TTS chunk {i + 1}: {chunk_time:.2f} seconds")

        dur = len(audio) / sr

        _spread_words(chunk, cursor, dur, words, wtimes, wdurs)

        parts.append(audio)

        if i < len(chunks) - 1:
            parts.append(gap)

        cursor += dur

        if i < len(chunks) - 1:
            cursor += len(gap) / sr

    result_audio = np.concatenate(parts)

    print(f"Total TTS time: {time.perf_counter() - start:.2f} seconds")

    return {
        "audio": result_audio,
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
    """WAV bytes. NEW: shares the cache with speak_payload, so repeat Listen is instant."""
    return base64.b64decode(speak_payload(text)["audio_base64"])


def _cache_key(cleaned: str) -> tuple:
    return (cleaned, config.TTS_VOICE, config.TTS_SPEED, config.TTS_MODEL)


def _cache_get(key):
    with _cache_lock:
        if key in _CACHE:
            _CACHE.move_to_end(key)
            return _CACHE[key]
    return None


def _cache_put(key, value) -> None:
    with _cache_lock:
        _CACHE[key] = value
        _CACHE.move_to_end(key)
        while len(_CACHE) > _CACHE_MAX:
            _CACHE.popitem(last=False)


def speak_payload(text: str) -> dict:
    """JSON-friendly version for the web: base64 WAV plus word timings.
    NEW: the same text is only generated once; the second Listen is instant."""
    cleaned = clean_text(text)
    if not cleaned:
        raise ValueError("Nothing to speak.")

    key = _cache_key(cleaned)
    hit = _cache_get(key)
    if hit is not None:
        print("TTS cache hit: instant")
        return hit

    with _gen_lock:
        hit = _cache_get(key)          # another request may have just finished it
        if hit is not None:
            print("TTS cache hit: instant")
            return hit

        r = speak(text)
        wav = to_wav_bytes(r["audio"], r["sample_rate"])
        payload = {
            "audio_base64": base64.b64encode(wav).decode("ascii"),
            "mime": "audio/wav",
            "sample_rate": r["sample_rate"],
            "duration_ms": r["duration_ms"],
            "words": r["words"],
            "wtimes": r["wtimes"],
            "wdurations": r["wdurations"],
        }
        _cache_put(key, payload)
        return payload


def prefetch(text: str) -> None:
    """NEW: start making the audio in the background (call it as soon as the answer text is ready).
    When the student taps Listen, the audio is already done or almost done."""
    def _job():
        try:
            speak_payload(text)
        except Exception as err:  # prefetch must never break the chat
            print(f"TTS prefetch skipped: {err}")

    threading.Thread(target=_job, daemon=True).start()


def speak_stream(text: str):
    """NEW: yields one small payload per chunk as soon as it is ready.
    The first chunk is short, so the first sound arrives much sooner.
    Word times are relative to the start of each chunk.
    If the same text was spoken before, the whole audio comes back at once."""
    cleaned = clean_text(text)
    if not cleaned:
        raise ValueError("Nothing to speak.")

    key = _cache_key(cleaned)
    hit = _cache_get(key)
    if hit is not None:
        print("TTS cache hit: instant")
        yield {**hit, "index": 0, "is_last": True}
        return

    engine = _get_engine()
    sr = config.TTS_SAMPLE_RATE
    gap = np.zeros(int(sr * 0.05), dtype=np.float32)
    chunks = _stream_chunks(cleaned)

    parts, all_words, all_times, all_durs = [], [], [], []
    cursor = 0.0

    for i, chunk in enumerate(chunks):
        with _gen_lock:
            started = time.perf_counter()
            audio = engine.synth(chunk)
            print(f"TTS stream chunk {i + 1}/{len(chunks)}: {time.perf_counter() - started:.2f} seconds")

        dur = len(audio) / sr
        words, wtimes, wdurs = [], [], []
        _spread_words(chunk, 0.0, dur, words, wtimes, wdurs)
        _spread_words(chunk, cursor, dur, all_words, all_times, all_durs)  # for the cache

        parts.append(audio)
        cursor += dur
        if i < len(chunks) - 1:
            parts.append(gap)
            cursor += len(gap) / sr

        yield {
            "index": i,
            "is_last": i == len(chunks) - 1,
            "audio_base64": base64.b64encode(to_wav_bytes(audio, sr)).decode("ascii"),
            "mime": "audio/wav",
            "sample_rate": sr,
            "duration_ms": round(dur * 1000),
            "words": words,
            "wtimes": wtimes,
            "wdurations": wdurs,
        }

    # finished without being cancelled: remember it, so the next Listen is instant
    wav = to_wav_bytes(np.concatenate(parts), sr)
    _cache_put(key, {
        "audio_base64": base64.b64encode(wav).decode("ascii"),
        "mime": "audio/wav",
        "sample_rate": sr,
        "duration_ms": round(cursor * 1000),
        "words": all_words,
        "wtimes": all_times,
        "wdurations": all_durs,
    })