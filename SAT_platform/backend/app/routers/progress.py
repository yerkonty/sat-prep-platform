from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.database import get_db
from app.models import Progress
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/progress", tags=["Progress"])


class AnalyticsResponse(BaseModel):
    total_questions: int
    correct_answers: int
    accuracy: float
    by_type: dict
    by_difficulty: dict
    recent_activity: List[dict]


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's progress analytics"""
    progress = db.query(Progress).filter(Progress.user_id == current_user.id).all()
    
    if not progress:
        return AnalyticsResponse(
            total_questions=0,
            correct_answers=0,
            accuracy=0.0,
            by_type={},
            by_difficulty={},
            recent_activity=[]
        )
    
    total = len(progress)
    correct = sum(1 for p in progress if p.is_correct)
    accuracy = (correct / total * 100) if total > 0 else 0.0
    
    # Get question types from progress
    from app.models import Question
    by_type = {"reading": 0, "writing": 0, "math": 0}
    by_difficulty = {"easy": 0, "medium": 0, "hard": 0}
    
    for p in progress:
        question = db.query(Question).filter(Question.id == p.question_id).first()
        if question:
            q_type = question.type.lower()
            q_diff = question.difficulty.lower()
            if q_type in by_type:
                by_type[q_type] = by_type.get(q_type, 0) + 1
            if q_diff in by_difficulty:
                by_difficulty[q_diff] = by_difficulty.get(q_diff, 0) + 1
    
    # Recent activity (last 10 attempts)
    recent = progress[-10:] if len(progress) > 10 else progress
    recent_activity = []
    for p in recent:
        question = db.query(Question).filter(Question.id == p.question_id).first()
        recent_activity.append({
            "question_id": p.question_id,
            "is_correct": p.is_correct,
            "type": question.type if question else "unknown",
            "answered_at": p.answered_at.isoformat() if p.answered_at else None
        })
    
    return AnalyticsResponse(
        total_questions=total,
        correct_answers=correct,
        accuracy=round(accuracy, 2),
        by_type=by_type,
        by_difficulty=by_difficulty,
        recent_activity=recent_activity
    )
