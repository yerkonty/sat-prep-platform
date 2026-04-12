from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List, Dict
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
    skill: Optional[str] = None
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
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Get practice questions with optional filters"""
    query = db.query(Question)

    if section:
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
        query = query.filter(func.lower(Question.difficulty) == difficulty.lower())

    questions = query.order_by(Question.id.asc()).offset(offset).limit(limit).all()
    return questions


@router.get("/stats", response_model=QuestionStatsResponse)
def get_question_stats(db: Session = Depends(get_db)):
    """Return nested question counts by section -> domain -> skill using real DB data."""
    rows = (
        db.query(
            Question.section, Question.domain, Question.skill, func.count(Question.id)
        )
        .group_by(Question.section, Question.domain, Question.skill)
        .all()
    )

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
        skill_name = skill_raw or "Unspecified"
        count_value = int(count)

        total_questions += count_value
        sections[section_id]["count"] += count_value
        sections[section_id]["domains"][domain_name]["count"] += count_value
        sections[section_id]["domains"][domain_name]["skills"][
            skill_name
        ] += count_value

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

    if request.answer < 0 or request.answer >= len(question.options):
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
        explanation=question.explanation or "No explanation available.",
    )
