from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from app.database import get_db
from app.models import Progress, Question
from app.dependencies import get_current_user
from app.routers.questions import normalize_section

router = APIRouter(prefix="/api/progress", tags=["Progress"])

WEAK_SKILL_MIN_ATTEMPTS = 3
WEAK_SKILL_LIMIT = 3
RECENT_ACTIVITY_LIMIT = 10


class SkillBreakdown(BaseModel):
    skill: str
    domain: Optional[str] = None
    section: str
    total: int
    correct: int
    accuracy: float


class DomainBreakdown(BaseModel):
    domain: str
    section: str
    total: int
    correct: int
    accuracy: float


class SectionBreakdown(BaseModel):
    section: str
    total: int
    correct: int
    accuracy: float


class RecentActivityItem(BaseModel):
    question_id: str
    is_correct: bool
    section: str
    skill: Optional[str] = None
    domain: Optional[str] = None
    difficulty: Optional[str] = None
    snippet: str
    answered_at: Optional[str] = None


class AnalyticsResponse(BaseModel):
    total_questions: int
    correct_answers: int
    accuracy: float
    time_spent_seconds: int
    by_type: dict
    by_difficulty: dict
    by_section: List[SectionBreakdown]
    by_domain: List[DomainBreakdown]
    by_skill: List[SkillBreakdown]
    weak_skills: List[SkillBreakdown]
    recent_activity: List[RecentActivityItem]


def _snippet(text: Optional[str], length: int = 90) -> str:
    if not text:
        return ""
    s = " ".join(text.split())
    return s if len(s) <= length else s[: length - 1].rstrip() + "…"


def get_analytics_for_user(user_id: str, db: Session) -> AnalyticsResponse:
    rows = (
        db.query(
            Progress.is_correct,
            Progress.time_taken,
            Progress.answered_at,
            Progress.question_id,
            Question.section,
            Question.type,
            Question.domain,
            Question.skill,
            Question.difficulty,
            Question.content,
        )
        .join(Question, Progress.question_id == Question.id)
        .filter(Progress.user_id == user_id)
        .order_by(Progress.answered_at.desc())
        .all()
    )

    if not rows:
        return AnalyticsResponse(
            total_questions=0,
            correct_answers=0,
            accuracy=0.0,
            time_spent_seconds=0,
            by_type={},
            by_difficulty={},
            by_section=[],
            by_domain=[],
            by_skill=[],
            weak_skills=[],
            recent_activity=[],
        )

    total = len(rows)
    correct = sum(1 for r in rows if r.is_correct)
    accuracy = round(correct / total * 100, 2) if total else 0.0
    time_spent = sum(int(r.time_taken or 0) for r in rows)

    by_type: dict = {"reading": 0, "writing": 0, "math": 0}
    by_difficulty: dict = {"easy": 0, "medium": 0, "hard": 0}

    section_agg: dict = defaultdict(lambda: {"total": 0, "correct": 0})
    domain_agg: dict = defaultdict(lambda: {"total": 0, "correct": 0, "section": "other"})
    skill_agg: dict = defaultdict(
        lambda: {"total": 0, "correct": 0, "section": "other", "domain": None}
    )

    for r in rows:
        section = normalize_section(r.section)
        if r.type and r.type.lower() in by_type:
            by_type[r.type.lower()] += 1
        if r.difficulty and r.difficulty.lower() in by_difficulty:
            by_difficulty[r.difficulty.lower()] += 1

        section_agg[section]["total"] += 1
        if r.is_correct:
            section_agg[section]["correct"] += 1

        if r.domain:
            d = domain_agg[r.domain]
            d["total"] += 1
            d["section"] = section
            if r.is_correct:
                d["correct"] += 1

        if r.skill:
            s = skill_agg[r.skill]
            s["total"] += 1
            s["section"] = section
            s["domain"] = r.domain
            if r.is_correct:
                s["correct"] += 1

    def acc(c: int, t: int) -> float:
        return round(c / t * 100, 2) if t else 0.0

    by_section = [
        SectionBreakdown(section=name, total=v["total"], correct=v["correct"], accuracy=acc(v["correct"], v["total"]))
        for name, v in section_agg.items()
    ]

    by_domain = [
        DomainBreakdown(
            domain=name,
            section=v["section"],
            total=v["total"],
            correct=v["correct"],
            accuracy=acc(v["correct"], v["total"]),
        )
        for name, v in domain_agg.items()
    ]
    by_domain.sort(key=lambda x: (-x.total, x.domain))

    by_skill = [
        SkillBreakdown(
            skill=name,
            domain=v["domain"],
            section=v["section"],
            total=v["total"],
            correct=v["correct"],
            accuracy=acc(v["correct"], v["total"]),
        )
        for name, v in skill_agg.items()
    ]
    by_skill.sort(key=lambda x: (-x.total, x.skill))

    weak_skills = sorted(
        [s for s in by_skill if s.total >= WEAK_SKILL_MIN_ATTEMPTS],
        key=lambda x: (x.accuracy, -x.total),
    )[:WEAK_SKILL_LIMIT]

    recent_activity = [
        RecentActivityItem(
            question_id=r.question_id,
            is_correct=bool(r.is_correct),
            section=normalize_section(r.section),
            skill=r.skill,
            domain=r.domain,
            difficulty=r.difficulty,
            snippet=_snippet(r.content),
            answered_at=r.answered_at.isoformat() if r.answered_at else None,
        )
        for r in rows[:RECENT_ACTIVITY_LIMIT]
    ]

    return AnalyticsResponse(
        total_questions=total,
        correct_answers=correct,
        accuracy=accuracy,
        time_spent_seconds=time_spent,
        by_type=by_type,
        by_difficulty=by_difficulty,
        by_section=by_section,
        by_domain=by_domain,
        by_skill=by_skill,
        weak_skills=weak_skills,
        recent_activity=recent_activity,
    )


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_analytics_for_user(current_user.id, db)
