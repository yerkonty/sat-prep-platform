"""Import and normalize SAT questions from College Board answer PDFs."""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Dict, Iterable, List, Set

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.migrations import run_startup_migrations
from app.models import Question
from pdf_parser import extract_questions_from_pdf


SAT_SOURCE_ROOT = Path(
    os.getenv("SAT_SOURCE_ROOT", r"C:\Users\Asus\OneDrive\Desktop\SAT")
)


def discover_answer_pdfs(root_dir: Path) -> List[Path]:
    """Find all source PDFs that include answers in filename."""
    if not root_dir.exists():
        return []

    pdfs = [
        path
        for path in root_dir.rglob("*.pdf")
        if "answer" in path.stem.lower() and path.is_file()
    ]
    pdfs.sort(key=lambda p: str(p).lower())
    return pdfs


def _upsert_question(session: Session, question_payload: Dict) -> str:
    """Insert or update one question and return operation label."""
    external_id = str(question_payload["question_id"])
    existing = session.query(Question).filter_by(external_id=external_id).first()

    normalized = {
        "external_id": external_id,
        "section": question_payload["section"],
        "type": question_payload["section"],
        "category": question_payload["domain"],
        "domain": question_payload["domain"],
        "skill": question_payload["skill"],
        "subcategory": question_payload.get("passage_type", "single"),
        "passage_type": question_payload.get("passage_type", "single"),
        "difficulty": question_payload.get("difficulty", "medium"),
        "content": question_payload["content"],
        "options": question_payload["options"],
        "correct_answer": int(question_payload["correct_answer"]),
        "explanation": question_payload.get("explanation", ""),
        "source": "College Board PDF",
    }

    if existing:
        for key, value in normalized.items():
            setattr(existing, key, value)
        return "updated"

    session.add(Question(id=str(uuid.uuid4()), **normalized))
    return "inserted"


def _delete_stale_college_board_questions(
    session: Session, imported_external_ids: Set[str]
) -> int:
    """Delete old College Board records that are no longer in parsed files."""
    deleted = 0
    if not imported_external_ids:
        return deleted

    existing_rows = (
        session.query(Question)
        .filter(Question.source.in_(["College Board", "College Board PDF"]))
        .all()
    )
    for row in existing_rows:
        if not row.external_id or row.external_id not in imported_external_ids:
            session.delete(row)
            deleted += 1
    return deleted


def import_from_pdfs(
    pdf_paths: Iterable[Path], purge_stale: bool = True
) -> Dict[str, int]:
    """Import all valid questions extracted from provided PDF files."""
    run_startup_migrations(engine)
    Base.metadata.create_all(bind=engine)

    counts = {
        "files": 0,
        "extracted": 0,
        "inserted": 0,
        "updated": 0,
        "skipped": 0,
        "deleted": 0,
    }
    imported_external_ids: Set[str] = set()

    session: Session = SessionLocal()
    try:
        for pdf_path in pdf_paths:
            counts["files"] += 1
            parsed_questions = extract_questions_from_pdf(str(pdf_path))
            counts["extracted"] += len(parsed_questions)

            for parsed in parsed_questions:
                if not parsed.get("question_id"):
                    counts["skipped"] += 1
                    continue
                if (
                    not isinstance(parsed.get("options"), list)
                    or len(parsed["options"]) != 4
                ):
                    counts["skipped"] += 1
                    continue
                if parsed.get("correct_answer") not in [0, 1, 2, 3]:
                    counts["skipped"] += 1
                    continue
                if not parsed.get("domain") or not parsed.get("skill"):
                    counts["skipped"] += 1
                    continue

                imported_external_ids.add(str(parsed["question_id"]))
                op = _upsert_question(session, parsed)
                counts[op] += 1

        if purge_stale:
            counts["deleted"] = _delete_stale_college_board_questions(
                session, imported_external_ids
            )

        session.commit()
        return counts
    finally:
        session.close()


def process_all_answer_pdfs(
    source_root: Path = SAT_SOURCE_ROOT, purge_stale: bool = True
) -> Dict[str, int]:
    """Main entrypoint: discover answer PDFs, parse, and import to DB."""
    pdf_paths = discover_answer_pdfs(source_root)
    if not pdf_paths:
        raise FileNotFoundError(f"No answer PDFs found under: {source_root}")

    print(f"Discovered {len(pdf_paths)} answer PDFs under {source_root}")
    for path in pdf_paths:
        print(f"  - {path}")

    counts = import_from_pdfs(pdf_paths, purge_stale=purge_stale)
    print("\n=== Import Summary ===")
    print(json.dumps(counts, indent=2))
    return counts


if __name__ == "__main__":
    process_all_answer_pdfs()
