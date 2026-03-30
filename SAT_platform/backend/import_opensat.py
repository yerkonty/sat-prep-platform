"""Importer for the OpenSAT public dataset into the local database."""
import uuid
from typing import Any, Dict, List, Optional

import requests
from sqlalchemy.orm import Session

from app.database import Base, engine, SessionLocal
from app.migrations import run_startup_migrations
from app.models import Question

OPEN_SAT_URL = "https://pinesat.com/api/questions"


LETTER_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}


def _build_content(question_block: Dict[str, Any]) -> str:
    paragraph = question_block.get("paragraph")
    stem = question_block.get("question") or question_block.get("prompt")
    parts: List[str] = []
    if paragraph:
        parts.append(str(paragraph).strip())
    if stem:
        parts.append(str(stem).strip())
    return "\n\n".join(parts).strip()


def _normalize_question(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    question_block = raw.get("question") or {}
    choices_obj = question_block.get("choices") or {}
    if not choices_obj:
        return None

    # Preserve letter ordering A-D so correct_answer index aligns with the source letter
    options: List[str] = [choices_obj.get(key, "").strip() for key in sorted(choices_obj.keys())]
    correct_letter = question_block.get("correct_answer") or raw.get("correct_answer")
    if not correct_letter:
        return None

    correct_index = LETTER_INDEX.get(str(correct_letter).strip().upper())
    if correct_index is None:
        return None

    content = _build_content(question_block)
    if not content:
        return None

    section = raw.get("section") or raw.get("Section") or raw.get("section_name")
    domain = raw.get("domain") or raw.get("Domain")

    return {
        "external_id": raw.get("id") or str(uuid.uuid4()),
        "section": str(section or "english").lower(),
        "type": str(section or "english").lower(),  # backwards compatibility with existing field
        "category": str(domain or "general").lower(),
        "domain": str(domain or "general").lower(),
        "difficulty": str(raw.get("difficulty") or question_block.get("difficulty") or "mixed").lower(),
        "content": content,
        "options": options,
        "correct_answer": correct_index,
        "explanation": question_block.get("explanation") or raw.get("explanation") or "",
        "source": "OpenSAT",
    }


def import_opensat(url: str = OPEN_SAT_URL) -> Dict[str, int]:
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list):
        raise ValueError("Unexpected response shape from OpenSAT API")

    run_startup_migrations(engine)
    Base.metadata.create_all(bind=engine)

    counts = {"inserted": 0, "updated": 0, "skipped": 0}
    session: Session = SessionLocal()
    try:
        for raw in data:
            normalized = _normalize_question(raw)
            if not normalized:
                counts["skipped"] += 1
                continue

            existing = session.query(Question).filter_by(external_id=normalized["external_id"]).first()
            if existing:
                for key, value in normalized.items():
                    setattr(existing, key, value)
                counts["updated"] += 1
            else:
                session.add(Question(id=str(uuid.uuid4()), **normalized))
                counts["inserted"] += 1
        session.commit()
        return counts
    finally:
        session.close()


if __name__ == "__main__":
    results = import_opensat()
    print(f"Imported OpenSAT questions: {results}")
