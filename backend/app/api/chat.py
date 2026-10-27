from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.chat.pipeline import chat_turn

router = APIRouter(tags=["chat"])


class AskRequest(BaseModel):
    message: str = Field(max_length=2000)
    session_id: str | None = None      # leave empty on the first message, then send back what you get
    name: str | None = Field(default=None, max_length=40)
    subject: str | None = None         # use the exact values from GET /chapters
    std: int | None = None
    chapter: int | None = None


@router.post("/ask")
def ask(req: AskRequest):
    scope = {"subject": req.subject, "std": req.std, "chapter": req.chapter}
    return chat_turn(req.message, req.session_id, scope, req.name)