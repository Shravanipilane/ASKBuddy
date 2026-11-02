import io
import threading
import numpy as np
from app.utils import config

_model = None
_lock = threading.Lock()


def _get_model():
    """Loads Whisper once, on first use."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from faster_whisper import WhisperModel
                _model = WhisperModel(
                    config.STT_MODEL_SIZE,
                    device="cpu",
                    compute_type=config.STT_COMPUTE_TYPE,
                    cpu_threads=config.STT_CPU_THREADS,
                )
    return _model


def warm_up() -> None:
    _get_model()


def _wav_to_array(data: bytes):
    """Reads a 16 kHz, 16-bit WAV (what the browser sends) without needing the av package."""
    import wave
    try:
        with wave.open(io.BytesIO(data)) as w:
            if w.getsampwidth() != 2 or w.getframerate() != 16000:
                return None
            channels = w.getnchannels()
            frames = w.readframes(w.getnframes())
        audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        if channels > 1:
            audio = audio.reshape(-1, channels).mean(axis=1)
        return audio
    except Exception:
        return None


def transcribe(audio, language: str | None = None) -> dict:
    """audio: numpy array (mic), raw bytes (uploaded file) or a file path."""
    lang = language or config.STT_LANGUAGE
    if lang in ("auto", "", None):
        lang = None

    if isinstance(audio, np.ndarray):
        source = audio
    elif isinstance(audio, (bytes, bytearray)):
        source = _wav_to_array(bytes(audio))
        if source is None:
            source = io.BytesIO(audio)
    else:
        source = str(audio)

    # Make quiet recordings louder so Whisper can hear them
    if isinstance(source, np.ndarray) and source.size:
        peak = float(np.abs(source).max())
        if 0 < peak < 0.5:
            source = source * (0.5 / peak)

    segments, info = _get_model().transcribe(
        source,
        language=lang,
        beam_size=5,
        vad_filter=False,
        initial_prompt=config.STT_PROMPT,
    )
    if info.duration > config.STT_MAX_SECONDS:
        raise ValueError(f"Audio too long ({info.duration:.0f}s). Max is {config.STT_MAX_SECONDS}s.")

    text = " ".join(s.text.strip() for s in segments).strip()
    return {"text": text, "language": info.language, "duration": round(info.duration, 2)}