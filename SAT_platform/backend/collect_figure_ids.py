#!/usr/bin/env python3
"""
Scan all math PDFs and collect question IDs that have a figure/diagram/table.
Saves only the IDs (not images) to Math_JSON/figure_ids/figure_question_ids.json

Usage:
  python collect_figure_ids.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber

PDF_DIR    = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math")
OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON/figure_ids")
OUTPUT_FILE = OUTPUT_DIR / "figure_question_ids.json"

MIN_FIGURE_GAP_PT = 40


def get_question_id(page) -> str | None:
    text = page.extract_text() or ""
    m = re.search(r"Question\s+ID\s*:?\s*([a-f0-9]+)", text, re.IGNORECASE)
    return m.group(1).lower() if m else None


def has_figure(page) -> bool:
    words = page.extract_words() or []
    words_sorted = sorted(words, key=lambda w: w["top"])

    question_bottom = None
    for w in words_sorted:
        if w["text"].strip().lower() != "question":
            continue
        same_line = [x for x in words_sorted if abs(x["top"] - w["top"]) < 4 and x is not w]
        if any(x["text"].strip().lower().startswith("id") for x in same_line):
            continue
        question_bottom = w["bottom"]
        break

    if question_bottom is None:
        return False

    below = [w for w in words_sorted if w["top"] > question_bottom + 4]
    if not below:
        return False

    return (below[0]["top"] - question_bottom) >= MIN_FIGURE_GAP_PT


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Scanning {len(pdfs)} PDFs...\n")

    figure_ids: dict[str, str] = {}  # question_id -> pdf filename

    for pdf_path in pdfs:
        count = 0
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                qid = get_question_id(page)
                if qid and has_figure(page):
                    figure_ids[qid] = pdf_path.name
                    count += 1
        print(f"  {pdf_path.name}: {count} with figures")

    OUTPUT_FILE.write_text(
        json.dumps(figure_ids, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\n{'─'*50}")
    print(f"Total questions with figures : {len(figure_ids)}")
    print(f"Saved to                     : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
