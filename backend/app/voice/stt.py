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


def transcribe(audio, language: str | None = None) -> dict:
    """audio: numpy array (mic), raw bytes (uploaded file) or a file path."""
    lang = language or config.STT_LANGUAGE
    if lang in ("auto", "", None):
        lang = None

    if isinstance(audio, np.ndarray):
        source = audio
    elif isinstance(audio, (bytes, bytearray)):
        source = io.BytesIO(audio)
    else:
        source = str(audio)

    segments, info = _get_model().transcribe(
        source,
        language=lang,
        beam_size=5,
        vad_filter=True,
        initial_prompt=config.STT_PROMPT,
    )
    if info.duration > config.STT_MAX_SECONDS:
        raise ValueError(f"Audio too long ({info.duration:.0f}s). Max is {config.STT_MAX_SECONDS}s.")

    text = " ".join(s.text.strip() for s in segments).strip()
    return {"text": text, "language": info.language, "duration": round(info.duration, 2)}