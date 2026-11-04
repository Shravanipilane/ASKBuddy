
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.mysql import get_db
from app.db.models import User, ChatSession, ChatMessage
from app.api.auth import get_current_user

router = APIRouter(prefix="/history", tags=["chat history"])


@router.get("")
def get_chat_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )

    return [
        {
            "id": session.id,
            "title": session.title,
            "book": session.book,
            "chapter": session.chapter,
            "created_at": session.created_at,
            "updated_at": session.updated_at
        }
        for session in sessions
    ]


@router.get("/{session_id}")
def get_chat_messages(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Chat session not found"
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )

    return {
        "id": session.id,
        "title": session.title,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "sources": message.sources,
                "created_at": message.created_at
            }
            for message in messages
        ]
    }
