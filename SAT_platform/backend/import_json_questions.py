#!/usr/bin/env python3
"""
Import Claude-generated math question JSON into the database.

Usage:
  python import_json_questions.py path/to/all_math_questions.json
  python import_json_questions.py path/to/Nonlinear_functions.json
"""

from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.migrations import run_startup_migrations
from app.models import Question

SKILL_TO_DOMAIN = {
    # Math — Algebra
    "Linear equations (one variable, two variables)": "Algebra",
    "Linear functions": "Algebra",
    "Linear inequalities in one or two variables": "Algebra",
    "Systems of equations": "Algebra",
    # Math — Advanced Math
    "Equivalent expressions": "Advanced Math",
    "Nonlinear equations": "Advanced Math",
    "Nonlinear functions": "Advanced Math",
    # Math — Problem-Solving and Data Analysis
    "Ratios, rates, proportional relationships, and units": "Problem-Solving and Data Analysis",
    "Percentages": "Problem-Solving and Data Analysis",
    "One-variable data: Distributions and measures of center and spread": "Problem-Solving and Data Analysis",
    "Two-variable data: Models and scatterplots": "Problem-Solving and Data Analysis",
    "Probability and conditional probability": "Problem-Solving and Data Analysis",
    "Inference from sample statistics and margin of error": "Problem-Solving and Data Analysis",
    "Evaluating statistical claims: Observational studies and experiments": "Problem-Solving and Data Analysis",
    # Math — Geometry and Trigonometry
    "Lines, angles, and triangles": "Geometry and Trigonometry",
    "Right triangles and trigonometry": "Geometry and Trigonometry",
    "Circles": "Geometry and Trigonometry",
    "Area and volume": "Geometry and Trigonometry",
    # Reading & Writing — Information and Ideas
    "Central Ideas and Details": "Information and Ideas",
    "Command of Evidence (Textual)": "Information and Ideas",
    "Command of Evidence (Quantitative)": "Information and Ideas",
    "Command of Evidence": "Information and Ideas",
    "Inferences": "Information and Ideas",
    # Reading & Writing — Craft and Structure
    "Words in Context": "Craft and Structure",
    "Text Structure and Purpose": "Craft and Structure",
    "Cross-Text Connections": "Craft and Structure",
    # Reading & Writing — Expression of Ideas
    "Transitions": "Expression of Ideas",
    "Rhetorical Synthesis": "Expression of Ideas",
    # Reading & Writing — Standard English Conventions
    "Boundaries": "Standard English Conventions",
    "Form, Structure, and Sense": "Standard English Conventions",
}


def _upsert(session: Session, q: dict) -> str:
    external_id = str(q["question_id"]).lower().strip()
    skill  = q.get("skill", "")
    domain = q.get("domain") or SKILL_TO_DOMAIN.get(skill, "")

    raw_section = q.get("section", "math")
    section = "rw" if raw_section in ("reading_writing", "rw") else raw_section

    passage_type = q.get("passage_type", "single") or "single"

    payload = {
        "external_id":  external_id,
        "section":      section,
        "type":         section,
        "domain":       domain,
        "skill":        skill,
        "category":     domain,
        "subcategory":  passage_type,
        "passage_type": passage_type,
        "difficulty":   str(q.get("difficulty", "medium")).lower(),
        "content":      q["content"],
        "options":      q["options"],
        "correct_answer": int(q["correct_answer"]),
        "explanation":  q.get("explanation", ""),
        "image":        q.get("image"),
        "source":       "College Board PDF",
    }

    existing = session.query(Question).filter_by(external_id=external_id).first()
    if existing:
        for k, v in payload.items():
            setattr(existing, k, v)
        return "updated"

    session.add(Question(id=str(uuid.uuid4()), **payload))
    return "inserted"


def import_file(json_path: Path) -> dict:
    run_startup_migrations(engine)
    Base.metadata.create_all(bind=engine)

    data = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("JSON must be an array of questions")

    counts = {"inserted": 0, "updated": 0, "skipped": 0}
    session: Session = SessionLocal()
    try:
        for q in data:
            if not q.get("question_id") or not q.get("content"):
                counts["skipped"] += 1
                continue
            if not isinstance(q.get("options"), list) or len(q["options"]) != 4:
                counts["skipped"] += 1
                continue
            if q.get("correct_answer") not in (0, 1, 2, 3):
                counts["skipped"] += 1
                continue

            op = _upsert(session, q)
            counts[op] += 1

        session.commit()
        return counts
    finally:
        session.close()


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python import_json_questions.py <path-to-json>")
        sys.exit(1)

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"File not found: {json_path}")
        sys.exit(1)

    print(f"Importing: {json_path}")
    counts = import_file(json_path)
    print(f"  inserted : {counts['inserted']}")
    print(f"  updated  : {counts['updated']}")
    print(f"  skipped  : {counts['skipped']}")
    print("Done.")


if __name__ == "__main__":
    main()
