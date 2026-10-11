from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.voice.stt import transcribe
from app.utils import config

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/transcribe")
def transcribe_audio(file: UploadFile = File(...), language: str | None = Form(None)):
    data = file.file.read()
    if not data:
        raise HTTPException(400, "Empty audio file.")
    if len(data) > config.STT_MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, "Audio file too large.")
    try:
        return transcribe(data, language)
    except ValueError as e:
        raise HTTPException(422, str(e))