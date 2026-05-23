from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func as sqla_func, case

from app.database import get_db
from app.models import User, Progress, ExamAttempt
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


def _display_name(name: str | None) -> str:
    if not name:
        return "Anonymous"
    parts = name.strip().split()
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


@router.get("")
def get_leaderboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            User.id,
            User.name,
            sqla_func.count(Progress.id).label("questions_answered"),
            sqla_func.sum(case((Progress.is_correct == True, 1), else_=0)).label("correct"),
        )
        .outerjoin(Progress, Progress.user_id == User.id)
        .filter(User.role == "student", User.is_active == True)
        .group_by(User.id)
        .all()
    )

    best_scores = dict(
        db.query(ExamAttempt.user_id, sqla_func.max(ExamAttempt.score))
        .filter(ExamAttempt.status == "completed")
        .group_by(ExamAttempt.user_id)
        .all()
    )

    entries = []
    for user_id, name, questions_answered, correct_count in rows:
        correct = int(correct_count or 0)
        total = int(questions_answered or 0)
        entries.append({
            "user_id": user_id,
            "display_name": _display_name(name),
            "questions_answered": total,
            "accuracy": round(correct / total * 100, 1) if total else 0.0,
            "best_exam_score": best_scores.get(user_id),
            "is_current_user": user_id == current_user.id,
        })

    entries.sort(key=lambda e: (-(e["best_exam_score"] if e["best_exam_score"] is not None else -1), -e["accuracy"]))

    for i, entry in enumerate(entries, 1):
        entry["rank"] = i

    return entries
