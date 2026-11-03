
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.chat.pipeline import chat_turn
from app.db.mysql import get_db
from app.db.models import User, ChatSession, ChatMessage
from app.api.auth import get_current_user

router = APIRouter(tags=["chat"])


class AskRequest(BaseModel):
    message: str = Field(max_length=2000)
    session_id: str | None = None
    name: str | None = Field(default=None, max_length=40)
    subject: str | None = None
    std: int | None = None
    chapter: int | None = None


@router.post("/ask")
def ask(
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify that the session belongs to this user
    if req.session_id:
        existing = db.query(ChatSession).filter(
            ChatSession.memory_session_id == req.session_id,
            ChatSession.user_id == current_user.id
        ).first()

        if existing is None:
            req.session_id = None

    scope = {
        "subject": req.subject,
        "std": req.std,
        "chapter": req.chapter
    }

    # Existing RAG pipeline
    result = chat_turn(
        req.message,
        req.session_id,
        scope,
        req.name
    )

    memory_id = result["session_id"]

    # Find or create the permanent database session
    chat_session = db.query(ChatSession).filter(
        ChatSession.memory_session_id == memory_id,
        ChatSession.user_id == current_user.id
    ).first()

    if chat_session is None:
        chat_session = ChatSession(
            user_id=current_user.id,
            memory_session_id=memory_id,
            title=req.message[:255]
        )
        db.add(chat_session)
        db.flush()

    # Save user question
    user_message = ChatMessage(
        session_id=chat_session.id,
        role="user",
        content=req.message[:4000]
    )

    # Save assistant answer
    assistant_message = ChatMessage(
        session_id=chat_session.id,
        role="assistant",
        content=result.get("text", "")[:4000],
        sources=result.get("sources", [])
    )

    db.add(user_message)
    db.add(assistant_message)
    db.commit()

    db.refresh(user_message)
    db.refresh(assistant_message)

    # Preserve the original RAG response
    result["history_session_id"] = chat_session.id
    result["user_message_id"] = user_message.id
    result["assistant_message_id"] = assistant_message.id

    return result
