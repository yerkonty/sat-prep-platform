#!/usr/bin/env python3
"""
One-off migration: copy all questions from local SQLite to a remote PostgreSQL
(e.g. Supabase). Reads source from ./sat_platform.db and writes to the
DATABASE_URL passed as the only required env var.

Usage:
  DATABASE_URL="postgresql://postgres.xxx:[encoded-password]@aws-0-region.pooler.supabase.com:6543/postgres" \
      python migrate_to_supabase.py
"""

from __future__ import annotations

import os
import sqlite3
import sys
import uuid
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

LOCAL_DB = Path(__file__).parent / "sat_platform.db"


def main() -> None:
    target_url = os.environ.get("DATABASE_URL", "")
    if not target_url or "sqlite" in target_url:
        print("ERROR: set DATABASE_URL to your Supabase connection string")
        sys.exit(1)

    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    if not LOCAL_DB.exists():
        print(f"ERROR: {LOCAL_DB} not found")
        sys.exit(1)

    # Build a fresh engine here (don't import app.database at module load — it caches the URL)
    os.environ["DATABASE_URL"] = target_url
    from sqlalchemy import create_engine
    from app.migrations import run_startup_migrations
    from app.models import Question
    from app.database import Base

    target_engine = create_engine(
        target_url,
        pool_pre_ping=True,
        pool_recycle=180,
    )

    print("Creating tables in Supabase...")
    run_startup_migrations(target_engine)
    Base.metadata.create_all(bind=target_engine)

    # Read all questions from local SQLite
    src = sqlite3.connect(str(LOCAL_DB))
    src.row_factory = sqlite3.Row
    rows = src.execute("SELECT * FROM questions").fetchall()
    print(f"Read {len(rows)} questions from local SQLite")

    # Pre-fetch all existing external_ids in one query so we don't query per row
    with Session(target_engine) as s:
        existing_ids = {x[0] for x in s.query(Question.external_id).all()}
    print(f"  {len(existing_ids)} already in Supabase — will update those, insert the rest")

    inserted = updated = skipped = 0
    BATCH = 50

    import json

    def commit_batch(rows_chunk):
        nonlocal inserted, updated, skipped
        with Session(target_engine) as session:
            for row in rows_chunk:
                data = dict(row)
                ext_id = data.get("external_id")
                if not ext_id or not data.get("content"):
                    skipped += 1
                    continue

                options_raw = data.get("options")
                if isinstance(options_raw, str):
                    try:
                        data["options"] = json.loads(options_raw)
                    except Exception:
                        skipped += 1
                        continue

                if ext_id in existing_ids:
                    existing = session.query(Question).filter_by(external_id=ext_id).first()
                    if existing:
                        for k, v in data.items():
                            if k == "id":
                                continue
                            setattr(existing, k, v)
                        updated += 1
                else:
                    if not data.get("id"):
                        data["id"] = str(uuid.uuid4())
                    session.add(Question(**data))
                    inserted += 1
                    existing_ids.add(ext_id)
            session.commit()

    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        commit_batch(chunk)
        done = min(i + BATCH, len(rows))
        print(f"  {done}/{len(rows)} processed (inserted={inserted}, updated={updated})")

    print(f"\nDone:")
    print(f"  inserted: {inserted}")
    print(f"  updated:  {updated}")
    print(f"  skipped:  {skipped}")


if __name__ == "__main__":
    main()
