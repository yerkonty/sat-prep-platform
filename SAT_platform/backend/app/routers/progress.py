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
    
    return AnalyticsResponse(
        total_questions=total,
        correct_answers=correct,
        accuracy=round(accuracy, 2),
        by_type={"reading": 0, "writing": 0, "math": 0},
        by_difficulty={"easy": 0, "medium": 0, "hard": 0},
        recent_activity=[]
    )
