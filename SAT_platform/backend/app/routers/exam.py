from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
import uuid

from app.database import get_db
from app.models import Question, ExamAttempt
from app.dependencies import get_current_user
from app.routers.questions import QuestionResponse

router = APIRouter(prefix="/api/exam", tags=["Exam"])

RW_QUESTION_COUNT = 27
MATH_QUESTION_COUNT = 22


class StartExamResponse(BaseModel):
    exam_id: str
    rw_questions: List[QuestionResponse]
    math_questions: List[QuestionResponse]


class SubmitExamRequest(BaseModel):
    rw_answers: Dict[str, int]
    math_answers: Dict[str, int]
    time_taken: Optional[int] = None


class ExamResultResponse(BaseModel):
    exam_id: str
    rw_score: int
    math_score: int
    total_score: int
    rw_correct: int
    rw_total: int
    math_correct: int
    math_total: int
    rw_question_ids: List[str]
    math_question_ids: List[str]
    rw_answers: Dict[str, int]
    math_answers: Dict[str, int]
    status: str


def _scaled_score(correct: int, total: int) -> int:
    if total <= 0:
        return 200
    return round((correct / total) * 600 + 200)


@router.post("/start", response_model=StartExamResponse)
def start_exam(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Begin a practice test. Selects 27 RW + 22 Math questions, all without images."""
    rw_questions = (
        db.query(Question)
        .filter(
            func.lower(Question.section).in_(
                [
                    "rw",
                    "r&w",
                    "reading",
                    "writing",
                    "english",
                    "reading_writing",
                    "reading-writing",
                    "reading & writing",
                    "reading and writing",
                ]
            ),
            Question.image.is_(None),
        )
        .order_by(func.random())
        .limit(RW_QUESTION_COUNT)
        .all()
    )

    math_questions = (
        db.query(Question)
        .filter(
            func.lower(Question.section).like("%math%"),
            Question.image.is_(None),
        )
        .order_by(func.random())
        .limit(MATH_QUESTION_COUNT)
        .all()
    )

    if len(rw_questions) < RW_QUESTION_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough text-only RW questions (need {RW_QUESTION_COUNT}, found {len(rw_questions)})",
        )
    if len(math_questions) < MATH_QUESTION_COUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough text-only Math questions (need {MATH_QUESTION_COUNT}, found {len(math_questions)})",
        )

    exam_id = str(uuid.uuid4())
    rw_ids = [q.id for q in rw_questions]
    math_ids = [q.id for q in math_questions]

    attempt = ExamAttempt(
        id=exam_id,
        user_id=current_user.id,
        status="in_progress",
        breakdown={
            "rw_question_ids": rw_ids,
            "math_question_ids": math_ids,
        },
    )
    db.add(attempt)
    db.commit()

    return StartExamResponse(
        exam_id=exam_id,
        rw_questions=[QuestionResponse.model_validate(q) for q in rw_questions],
        math_questions=[QuestionResponse.model_validate(q) for q in math_questions],
    )


@router.post("/{exam_id}/submit", response_model=ExamResultResponse)
def submit_exam(
    exam_id: str,
    request: SubmitExamRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Submit completed exam, compute score, mark as completed."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == exam_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam not found")
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if attempt.status == "completed":
        raise HTTPException(status_code=400, detail="Exam already submitted")

    breakdown = attempt.breakdown or {}
    rw_ids: List[str] = breakdown.get("rw_question_ids", [])
    math_ids: List[str] = breakdown.get("math_question_ids", [])

    all_ids = rw_ids + math_ids
    questions_map = {
        q.id: q for q in db.query(Question).filter(Question.id.in_(all_ids)).all()
    }

    rw_correct = 0
    for qid in rw_ids:
        q = questions_map.get(qid)
        if q is None:
            continue
        submitted = request.rw_answers.get(qid)
        if submitted is not None and submitted == q.correct_answer:
            rw_correct += 1

    math_correct = 0
    for qid in math_ids:
        q = questions_map.get(qid)
        if q is None:
            continue
        submitted = request.math_answers.get(qid)
        if submitted is not None and submitted == q.correct_answer:
            math_correct += 1

    rw_total = len(rw_ids)
    math_total = len(math_ids)
    rw_score = _scaled_score(rw_correct, rw_total)
    math_score = _scaled_score(math_correct, math_total)
    total_score = rw_score + math_score

    new_breakdown = {
        "rw_question_ids": rw_ids,
        "math_question_ids": math_ids,
        "rw_answers": request.rw_answers,
        "math_answers": request.math_answers,
        "rw_correct": rw_correct,
        "rw_total": rw_total,
        "math_correct": math_correct,
        "math_total": math_total,
        "rw_score": rw_score,
        "math_score": math_score,
    }

    attempt.status = "completed"
    attempt.score = total_score
    attempt.time_taken = request.time_taken
    attempt.breakdown = new_breakdown
    attempt.completed_at = datetime.utcnow()
    db.commit()

    return ExamResultResponse(
        exam_id=exam_id,
        rw_score=rw_score,
        math_score=math_score,
        total_score=total_score,
        rw_correct=rw_correct,
        rw_total=rw_total,
        math_correct=math_correct,
        math_total=math_total,
        rw_question_ids=rw_ids,
        math_question_ids=math_ids,
        rw_answers=request.rw_answers,
        math_answers=request.math_answers,
        status="completed",
    )


@router.get("/{exam_id}/result", response_model=ExamResultResponse)
def get_exam_result(
    exam_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Fetch results for a completed exam."""
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == exam_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Exam not found")
    if attempt.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    breakdown = attempt.breakdown or {}
    return ExamResultResponse(
        exam_id=exam_id,
        rw_score=breakdown.get("rw_score", 0),
        math_score=breakdown.get("math_score", 0),
        total_score=(breakdown.get("rw_score", 0) + breakdown.get("math_score", 0)),
        rw_correct=breakdown.get("rw_correct", 0),
        rw_total=breakdown.get("rw_total", 0),
        math_correct=breakdown.get("math_correct", 0),
        math_total=breakdown.get("math_total", 0),
        rw_question_ids=breakdown.get("rw_question_ids", []),
        math_question_ids=breakdown.get("math_question_ids", []),
        rw_answers=breakdown.get("rw_answers", {}),
        math_answers=breakdown.get("math_answers", {}),
        status=attempt.status or "in_progress",
    )
