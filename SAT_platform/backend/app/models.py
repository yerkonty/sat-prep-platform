from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    
    stripe_customer_id = Column(String)
    subscription_plan = Column(String, default="free")
    subscription_end = Column(DateTime)
    
    ai_messages_used = Column(Integer, default=0)
    ai_messages_limit = Column(Integer, default=5)
    
    progress = relationship("Progress", back_populates="user")
    flashcard_decks = relationship("FlashcardDeck", back_populates="user")
    exam_attempts = relationship("ExamAttempt", back_populates="user")


class Question(Base):
    __tablename__ = "questions"
    
    id = Column(String, primary_key=True, index=True)
    type = Column(String, index=True)
    category = Column(String, index=True)
    difficulty = Column(String, index=True)
    content = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)
    correct_answer = Column(Integer, nullable=False)
    explanation = Column(Text)
    source = Column(String)
    
    progress = relationship("Progress", back_populates="question")


class Progress(Base):
    __tablename__ = "progress"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    question_id = Column(String, ForeignKey("questions.id"))
    is_correct = Column(Boolean)
    time_taken = Column(Integer)
    answered_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="progress")
    question = relationship("Question", back_populates="progress")


class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    is_premium = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="flashcard_decks")
    cards = relationship("Flashcard", back_populates="deck")


class Flashcard(Base):
    __tablename__ = "flashcards"
    
    id = Column(String, primary_key=True, index=True)
    deck_id = Column(String, ForeignKey("flashcard_decks.id"))
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    next_review = Column(DateTime, server_default=func.now())
    
    deck = relationship("FlashcardDeck", back_populates="cards")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    score = Column(Integer)
    breakdown = Column(JSON)
    time_taken = Column(Integer)
    completed_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", back_populates="exam_attempts")


class Lesson(Base):
    __tablename__ = "lessons"
    
    id = Column(String, primary_key=True, index=True)
    category = Column(String, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    order = Column(Integer, default=0)
