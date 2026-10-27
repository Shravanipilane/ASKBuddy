from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.qr_resolver.resolver import resolve

router = APIRouter(tags=["qr"])


class QRRequest(BaseModel):
    code: str = Field(min_length=1, max_length=2000)   # the text or link inside the QR code


@router.post("/qr/resolve")
def resolve_qr(req: QRRequest):
    record = resolve(req.code)
    if record is None:
        raise HTTPException(404, "This QR code isn't linked to a chapter yet.")
    return record