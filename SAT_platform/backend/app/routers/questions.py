from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid

from app.database import get_db
from app.models import Question, Progress, SavedQuestion
from app.dependencies import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/questions", tags=["Questions"])


class QuestionResponse(BaseModel):
    id: str
    external_id: Optional[str] = None
    section: Optional[str] = None
    type: Optional[str] = None
    domain: Optional[str] = None
    skill: Optional[str] = None
    category: Optional[str] = None
    passage_type: Optional[str] = None
    difficulty: Optional[str] = None
    content: str
    options: list
    explanation: Optional[str] = None
    image: Optional[str] = None

    class Config:
        from_attributes = True


class AnswerRequest(BaseModel):
    question_id: str
    answer: Optional[int] = None
    answer_text: Optional[str] = None
    time_taken: int


class AnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: int
    correct_answer_text: Optional[str] = None
    explanation: str


def _normalize_spr_value(value: str) -> str:
    import re

    text = (value or "").strip()
    # Strip LaTeX delimiters and common formatting.
    text = text.replace("$", "").replace("\\$", "").replace(",", "").replace(" ", "")
    text = text.replace("\\%", "").replace("%", "")
    text = text.strip()
    # Strip outer parentheses.
    if text.startswith("(") and text.endswith(")"):
        text = text[1:-1].strip()
    return text


def _spr_answer_matches(user_input: str, correct_value: str) -> bool:
    from fractions import Fraction

    user_norm = _normalize_spr_value(user_input)
    if not user_norm:
        return False

    # College Board often lists multiple acceptable forms separated by ", "
    # (e.g. "24.5, 49/2" or "135/8, 16.87, 16.88"). Treat each as a valid answer.
    if ", " in (correct_value or ""):
        accepted = [p.strip() for p in correct_value.split(",") if p.strip()]
    else:
        accepted = [correct_value or ""]

    def to_number(text: str):
        try:
            if "/" in text:
                return float(Fraction(text))
            return float(text)
        except (ValueError, ZeroDivisionError):
            return None

    user_num = to_number(user_norm)

    for form in accepted:
        correct_norm = _normalize_spr_value(form)
        if user_norm.lower() == correct_norm.lower():
            return True
        correct_num = to_number(correct_norm)
        if user_num is not None and correct_num is not None:
            if abs(user_num - correct_num) < 1e-4:
                return True
            if correct_num != 0 and abs((user_num - correct_num) / correct_num) < 1e-3:
                return True

    return False


class SkillStatsResponse(BaseModel):
    name: str
    count: int


class DomainStatsResponse(BaseModel):
    name: str
    count: int
    skills: List[SkillStatsResponse]


class SectionStatsResponse(BaseModel):
    id: str
    title: str
    count: int
    domains: List[DomainStatsResponse]


class QuestionStatsResponse(BaseModel):
    total_questions: int
    sections: List[SectionStatsResponse]


def normalize_section(raw_section: Optional[str]) -> str:
    if not raw_section:
        return "other"

    value = raw_section.strip().lower()
    if value in {
        "rw",
        "r&w",
        "reading",
        "writing",
        "english",
        "reading_writing",
        "reading-writing",
        "reading & writing",
        "reading and writing",
    }:
        return "rw"
    if "math" in value:
        return "math"
    return "other"


def section_title(section_id: str) -> str:
    titles = {"rw": "Reading & Writing", "math": "Math", "other": "Other"}
    return titles.get(section_id, "Other")


@router.get("", response_model=List[QuestionResponse])
def get_questions(
    section: Optional[str] = None,
    domain: Optional[str] = None,
    skill: Optional[str] = None,
    subcategory: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_id: Optional[str] = None,
    has_image: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get practice questions with optional filters"""
    query = db.query(Question)
    normalized_question_id = question_id.strip().lower() if question_id else None

    if normalized_question_id:
        query = query.filter(
            or_(
                func.lower(Question.external_id) == normalized_question_id,
                func.lower(Question.id) == normalized_question_id,
            )
        )
    elif section:
        section_value = section.strip().lower()
        if section_value in {
            "rw",
            "r&w",
            "reading",
            "writing",
            "english",
            "reading_writing",
            "reading-writing",
            "reading & writing",
            "reading and writing",
        }:
            query = query.filter(
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
                )
            )
        elif section_value == "math":
            query = query.filter(func.lower(Question.section).like("%math%"))
        else:
            query = query.filter(func.lower(Question.section) == section_value)
    if domain:
        query = query.filter(func.lower(Question.domain) == domain.lower())
    if skill:
        query = query.filter(func.lower(Question.skill) == skill.lower())
    if subcategory:
        query = query.filter(func.lower(Question.subcategory) == subcategory.lower())
    if type:
        query = query.filter(func.lower(Question.type) == type.lower())
    if category:
        query = query.filter(func.lower(Question.category) == category.lower())
    if difficulty:
        difficulties = [d.strip().lower() for d in difficulty.split(",") if d.strip()]
        if len(difficulties) == 1:
            query = query.filter(func.lower(Question.difficulty) == difficulties[0])
        elif difficulties:
            query = query.filter(func.lower(Question.difficulty).in_(difficulties))
    if has_image is False:
        query = query.filter(Question.image.is_(None))
    elif has_image is True:
        query = query.filter(Question.image.isnot(None))

    questions = query.order_by(Question.id.asc()).offset(offset).limit(limit).all()
    return questions


@router.get("/stats", response_model=QuestionStatsResponse)
def get_question_stats(
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Return nested question counts by section -> domain -> skill using real DB data."""
    query = db.query(
        Question.section, Question.domain, Question.skill, func.count(Question.id)
    )

    if difficulty:
        difficulties = [d.strip().lower() for d in difficulty.split(",") if d.strip()]
        if len(difficulties) == 1:
            query = query.filter(func.lower(Question.difficulty) == difficulties[0])
        elif difficulties:
            query = query.filter(func.lower(Question.difficulty).in_(difficulties))

    rows = query.group_by(Question.section, Question.domain, Question.skill).all()

    sections: Dict[str, Dict] = {
        "rw": {
            "count": 0,
            "domains": defaultdict(lambda: {"count": 0, "skills": defaultdict(int)}),
        },
        "math": {
            "count": 0,
            "domains": defaultdict(lambda: {"count": 0, "skills": defaultdict(int)}),
        },
        "other": {
            "count": 0,
            "domains": defaultdict(lambda: {"count": 0, "skills": defaultdict(int)}),
        },
    }

    total_questions = 0

    for section_raw, domain_raw, skill_raw, count in rows:
        section_id = normalize_section(section_raw)
        domain_name = domain_raw or "Uncategorized"
        count_value = int(count)

        total_questions += count_value
        sections[section_id]["count"] += count_value
        sections[section_id]["domains"][domain_name]["count"] += count_value
        if skill_raw:
            sections[section_id]["domains"][domain_name]["skills"][skill_raw] += count_value

    section_order = ["rw", "math", "other"]
    response_sections: List[SectionStatsResponse] = []

    for section_id in section_order:
        section_data = sections[section_id]
        if section_id == "other" and section_data["count"] == 0:
            continue

        domain_items: List[DomainStatsResponse] = []
        for domain_name, domain_data in section_data["domains"].items():
            skill_items = [
                SkillStatsResponse(name=skill_name, count=skill_count)
                for skill_name, skill_count in sorted(
                    domain_data["skills"].items(), key=lambda item: (-item[1], item[0])
                )
            ]
            domain_items.append(
                DomainStatsResponse(
                    name=domain_name, count=domain_data["count"], skills=skill_items
                )
            )

        domain_items.sort(key=lambda d: (-d.count, d.name))
        response_sections.append(
            SectionStatsResponse(
                id=section_id,
                title=section_title(section_id),
                count=section_data["count"],
                domains=domain_items,
            )
        )

    return QuestionStatsResponse(
        total_questions=total_questions, sections=response_sections
    )


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


@router.get("/skills")
def get_skills(db: Session = Depends(get_db)):
    """Get all question skills"""
    skills = db.query(Question.skill).distinct().all()
    return {"skills": [s[0] for s in skills if s[0]]}


@router.post("/answer", response_model=AnswerResponse)
def answer_question(
    request: AnswerRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an answer to a question"""
    question = db.query(Question).filter(Question.id == request.question_id).first()

    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    correct_answer_text: Optional[str] = None
    options = question.options or []
    if 0 <= (question.correct_answer or 0) < len(options):
        correct_answer_text = str(options[question.correct_answer])

    if request.answer_text is not None:
        if correct_answer_text is None:
            raise HTTPException(status_code=400, detail="Question has no answer")
        is_correct = _spr_answer_matches(request.answer_text, correct_answer_text)
    else:
        if request.answer is None or request.answer < 0 or request.answer >= len(options):
            raise HTTPException(status_code=400, detail="Invalid answer index")
        is_correct = request.answer == question.correct_answer

    progress = Progress(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        question_id=question.id,
        is_correct=is_correct,
        time_taken=request.time_taken,
    )
    db.add(progress)
    db.commit()

    return AnswerResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        correct_answer_text=correct_answer_text,
        explanation=question.explanation or "No explanation available.",
    )


@router.get("/saved", response_model=List[str])
def get_saved_questions(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SavedQuestion.question_id)
        .filter(SavedQuestion.user_id == current_user.id)
        .all()
    )
    return [r[0] for r in rows]


@router.post("/{question_id}/save", status_code=201)
def save_question(
    question_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(SavedQuestion)
        .filter(
            SavedQuestion.user_id == current_user.id,
            SavedQuestion.question_id == question_id,
        )
        .first()
    )
    if existing:
        return {"status": "already_saved"}

    db.add(SavedQuestion(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        question_id=question_id,
    ))
    db.commit()
    return {"status": "saved"}


@router.delete("/{question_id}/save")
def unsave_question(
    question_id: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(SavedQuestion)
        .filter(
            SavedQuestion.user_id == current_user.id,
            SavedQuestion.question_id == question_id,
        )
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
    return {"status": "removed"}
