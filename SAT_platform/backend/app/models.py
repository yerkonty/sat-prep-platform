from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String)
    reset_token: Mapped[Optional[str]] = mapped_column(String)
    reset_token_expires: Mapped[Optional[datetime]] = mapped_column(DateTime)

    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String)
    subscription_plan: Mapped[str] = mapped_column(String, default="free")
    subscription_end: Mapped[Optional[datetime]] = mapped_column(DateTime)

    ai_messages_used: Mapped[int] = mapped_column(Integer, default=0)
    ai_messages_limit: Mapped[int] = mapped_column(Integer, default=5)

    progress: Mapped[List["Progress"]] = relationship(back_populates="user")
    flashcard_decks: Mapped[List["FlashcardDeck"]] = relationship(back_populates="user")
    exam_attempts: Mapped[List["ExamAttempt"]] = relationship(back_populates="user")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    section: Mapped[Optional[str]] = mapped_column(String, index=True)
    type: Mapped[Optional[str]] = mapped_column(String, index=True)
    category: Mapped[Optional[str]] = mapped_column(String, index=True)
    domain: Mapped[Optional[str]] = mapped_column(String, index=True)
    skill: Mapped[Optional[str]] = mapped_column(String, index=True)
    subcategory: Mapped[Optional[str]] = mapped_column(String, index=True)
    passage_type: Mapped[Optional[str]] = mapped_column(String, index=True)
    difficulty: Mapped[Optional[str]] = mapped_column(String, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[Any] = mapped_column(JSON, nullable=False)
    correct_answer: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String)
    external_id: Mapped[Optional[str]] = mapped_column(String, unique=True, index=True)

    progress: Mapped[List["Progress"]] = relationship(back_populates="question")


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"))
    question_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("questions.id"))
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean)
    time_taken: Mapped[Optional[int]] = mapped_column(Integer)
    answered_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[Optional["User"]] = relationship(back_populates="progress")
    question: Mapped[Optional["Question"]] = relationship(back_populates="progress")


class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_shared: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[Optional["User"]] = relationship(back_populates="flashcard_decks")
    cards: Mapped[List["Flashcard"]] = relationship(back_populates="deck")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    deck_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("flashcard_decks.id"))
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    next_review: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    interval_days: Mapped[int] = mapped_column(Integer, default=0)

    deck: Mapped[Optional["FlashcardDeck"]] = relationship(back_populates="cards")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id"))
    score: Mapped[Optional[int]] = mapped_column(Integer)
    breakdown: Mapped[Optional[Any]] = mapped_column(JSON)
    time_taken: Mapped[Optional[int]] = mapped_column(Integer)
    completed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    status: Mapped[str] = mapped_column(String, default="in_progress")
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped[Optional["User"]] = relationship(back_populates="exam_attempts")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String, primary_key=True, index=True)
    category: Mapped[Optional[str]] = mapped_column(String, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)
