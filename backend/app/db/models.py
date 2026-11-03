from sqlalchemy import Column, Integer, String, TIMESTAMP, text
from app.db.mysql import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    class_level = Column(String(20), nullable=False)
    stream = Column(String(50), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP")
    )


# Paste these into models.py, below your existing User class.
# They reuse the same Base, same style (Column/text server_default) you're
# already using. Only two things change on User itself — see the bottom.

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Date,
    TIMESTAMP,
    ForeignKey,
    JSON,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship
from app.db.mysql import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    memory_session_id = Column(String(64), unique=True, nullable=True, index=True)
    title = Column(String(255), nullable=True)
    book = Column(String(100), nullable=True)
    chapter = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, nullable=True, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(
        TIMESTAMP,
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=text("CURRENT_TIMESTAMP"),
    )

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(String(4000), nullable=False)
    sources = Column(JSON, nullable=True)  # [{"book": "...", "chapter": "...", "page": 12}, ...]
    created_at = Column(TIMESTAMP, nullable=True, server_default=text("CURRENT_TIMESTAMP"))

    session = relationship("ChatSession", back_populates="messages")


class SavedQuestion(Base):
    __tablename__ = "saved_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message_id = Column(Integer, ForeignKey("chat_messages.id", ondelete="SET NULL"), nullable=True)
    question = Column(String(1000), nullable=False)
    answer = Column(String(4000), nullable=False)
    book = Column(String(100), nullable=True)
    chapter = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, nullable=True, server_default=text("CURRENT_TIMESTAMP"))


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "item_type", "item_name", "class_level", name="uq_favorite"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String(20), nullable=False)  # "subject" or "book"
    item_name = Column(String(150), nullable=False)
    class_level = Column(String(20), nullable=True)
    created_at = Column(TIMESTAMP, nullable=True, server_default=text("CURRENT_TIMESTAMP"))


class Progress(Base):
    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("user_id", "book", "chapter", name="uq_progress"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    book = Column(String(100), nullable=False)
    chapter = Column(String(100), nullable=False)
    class_level = Column(String(20), nullable=True)
    questions_asked = Column(Integer, nullable=False, server_default=text("1"))
    last_accessed = Column(TIMESTAMP, nullable=True, server_default=text("CURRENT_TIMESTAMP"))


class Settings(Base):
    __tablename__ = "settings"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    voice_enabled = Column(Boolean, nullable=False, server_default=text("1"))
    tts_speed = Column(Float, nullable=False, server_default=text("1.0"))
    language = Column(String(10), nullable=False, server_default=text("'en'"))
    theme = Column(String(10), nullable=False, server_default=text("'light'"))


# ── Changes to your existing User class ──────────────────────────────
# Add these two columns inside User (for the streak/notification feature —
# no extra table needed, just two columns on the user row):
#
#     last_active_date = Column(Date, nullable=True)
#     current_streak = Column(Integer, nullable=False, server_default=text("0"))
#
# After adding these models + columns, generate a migration (if you're using
# Alembic) instead of relying on Base.metadata.create_all, since you already
# have a live users table:
#
#     alembic revision --autogenerate -m "add chat/saved/favorites/progress/settings tables"
#     alembic upgrade head
#
# If you're not using Alembic yet and this is still local dev with a
# throwaway DB, Base.metadata.create_all(engine) will create the new tables
# fine (it won't touch the existing users table's existing columns, but it
# also won't add the two new ones to it — you'd need to add those manually
# via a quick ALTER TABLE or just drop and recreate users in dev).