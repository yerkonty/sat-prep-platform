from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.database import get_db
from app.models import Question, Progress
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/questions", tags=["Questions"])


class QuestionResponse(BaseModel):
    id: str
    section: Optional[str] = None
    type: Optional[str] = None
    domain: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    content: str
    options: list
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


class AnswerRequest(BaseModel):
    question_id: str
    answer: int
    time_taken: int


class AnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: int
    explanation: str


@router.get("", response_model=List[QuestionResponse])
def get_questions(
    section: Optional[str] = None,
    domain: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get practice questions with optional filters"""
    query = db.query(Question)

    if section:
        query = query.filter(func.lower(Question.section) == section.lower())
    if domain:
        query = query.filter(func.lower(Question.domain) == domain.lower())
    if type:
        query = query.filter(func.lower(Question.type) == type.lower())
    if category:
        query = query.filter(func.lower(Question.category) == category.lower())
    if difficulty:
        query = query.filter(func.lower(Question.difficulty) == difficulty.lower())

    questions = query.limit(limit).all()
    return questions


@router.get("/types")
def get_types(db: Session = Depends(get_db)):
    """Get all question types"""
    types = db.query(Question.type).distinct().all()
    return {"types": [t[0] for t in types]}


@router.get("/sections")
def get_sections(db: Session = Depends(get_db)):
    """Get all question sections"""
    sections = db.query(Question.section).distinct().all()
    return {"sections": [s[0] for s in sections if s[0]]}


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Get all question categories"""
    categories = db.query(Question.category).distinct().all()
    return {"categories": [c[0] for c in categories]}


@router.get("/domains")
def get_domains(db: Session = Depends(get_db)):
    """Get all question domains"""
    domains = db.query(Question.domain).distinct().all()
    return {"domains": [d[0] for d in domains if d[0]]}


@router.post("/answer", response_model=AnswerResponse)
def answer_question(
    request: AnswerRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an answer to a question"""
    question = db.query(Question).filter(Question.id == request.question_id).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if request.answer < 0 or request.answer >= len(question.options):
        raise HTTPException(status_code=400, detail="Invalid answer index")

    is_correct = request.answer == question.correct_answer
    
    progress = Progress(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        question_id=question.id,
        is_correct=is_correct,
        time_taken=request.time_taken
    )
    db.add(progress)
    db.commit()
    
    return AnswerResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation or "No explanation available."
    )
