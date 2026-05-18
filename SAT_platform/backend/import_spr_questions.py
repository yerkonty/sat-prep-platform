#!/usr/bin/env python3
"""
Import SPR (Student-Produced Response) question JSON into the database.

SPR entries have a 1-element `options` array containing the correct answer
text; the standard importer rejects those because it requires len(options)==4.

Usage:
  python import_spr_questions.py "/path/to/Area and volume_SPR.json"
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
from import_json_questions import SKILL_TO_DOMAIN


def _upsert(session: Session, q: dict) -> str:
    external_id = str(q["question_id"]).lower().strip()
    skill  = q.get("skill", "")
    domain = q.get("domain") or SKILL_TO_DOMAIN.get(skill, "")

    payload = {
        "external_id":  external_id,
        "section":      "math",
        "type":         "math",
        "domain":       domain,
        "skill":        skill,
        "category":     domain,
        "subcategory":  "spr",
        "passage_type": "single",
        "difficulty":   str(q.get("difficulty", "medium")).lower(),
        "content":      q["content"],
        "options":      q["options"],          # 1-element list
        "correct_answer": 0,
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


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python import_spr_questions.py <path-to-json>")
        sys.exit(1)

    json_path = Path(sys.argv[1])
    if not json_path.exists():
        print(f"File not found: {json_path}")
        sys.exit(1)

    run_startup_migrations(engine)
    Base.metadata.create_all(bind=engine)

    data = json.loads(json_path.read_text(encoding="utf-8"))
    counts = {"inserted": 0, "updated": 0, "skipped": 0}
    session: Session = SessionLocal()
    try:
        for q in data:
            if not q.get("question_id") or not q.get("content"):
                counts["skipped"] += 1
                continue
            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) != 1 or not str(opts[0]).strip():
                counts["skipped"] += 1
                continue
            counts[_upsert(session, q)] += 1
        session.commit()
    finally:
        session.close()

    print(f"Imported from: {json_path}")
    print(f"  inserted : {counts['inserted']}")
    print(f"  updated  : {counts['updated']}")
    print(f"  skipped  : {counts['skipped']}")


if __name__ == "__main__":
    main()
