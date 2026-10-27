import logging
import threading
from contextlib import contextmanager

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.utils import config
from app.voice.stt import transcribe
from app.voice.tts import speak_payload, speak_wav

log = logging.getLogger("askbuddy.voice")
router = APIRouter(prefix="/voice", tags=["voice"])

# On a CPU server, run only a few voice jobs at a time so the machine does not choke.
_gate = threading.BoundedSemaphore(config.VOICE_CONCURRENCY)


@contextmanager
def _slot():
    if not _gate.acquire(timeout=30):
        raise HTTPException(503, "Voice is busy right now. Please try again in a moment.")
    try:
        yield
    finally:
        _gate.release()


@router.post("/transcribe")
def transcribe_audio(file: UploadFile = File(...), language: str | None = Form(None)):
    """Audio file (webm, wav, mp3, m4a...) in, text out."""
    data = file.file.read()
    if not data:
        raise HTTPException(400, "Empty audio file.")
    if len(data) > config.STT_MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, "Audio file too large.")
    try:
        with _slot():
            return transcribe(data, language)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        log.exception("Transcription failed")
        raise HTTPException(422, "Could not read that audio. Please try recording again.")


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


@router.post("/speak")
def speak_text(req: SpeakRequest):
    """Text in, WAV audio out."""
    try:
        with _slot():
            wav = speak_wav(req.text)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(422, str(e))
    return Response(content=wav, media_type="audio/wav")


@router.post("/speak_json")
def speak_text_json(req: SpeakRequest):
    """Text in, JSON out: base64 WAV plus word timings (for the avatar's lip-sync)."""
    try:
        with _slot():
            return speak_payload(req.text)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(422, str(e))