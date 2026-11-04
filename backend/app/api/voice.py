import json
import logging
import threading
from contextlib import contextmanager

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from app.utils import config
from app.voice.stt import transcribe
from app.voice.tts import clean_text, speak_payload, speak_stream, speak_wav

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


@router.post("/speak_stream")
def speak_text_stream(req: SpeakRequest):
    """NEW: text in, audio out piece by piece (one JSON object per line).
    The first piece is a short phrase, so the student hears Buddy start quickly."""
    if not clean_text(req.text):
        raise HTTPException(422, "Nothing to speak.")

    if not _gate.acquire(timeout=30):
        raise HTTPException(503, "Voice is busy right now. Please try again in a moment.")

    released = threading.Event()

    def release():
        # safe to call twice: the slot is given back only once
        if not released.is_set():
            released.set()
            _gate.release()

    def lines():
        try:
            for piece in speak_stream(req.text):
                yield json.dumps(piece) + "\n"
        except Exception:
            log.exception("Streaming speech failed")
        finally:
            release()

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        background=BackgroundTask(release),
    )