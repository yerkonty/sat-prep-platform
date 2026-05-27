#!/usr/bin/env python3
"""
Parse a SAT math PDF with a low-cost hybrid workflow.

Strategy:
1. Parse locally with pdfplumber via pdf_parser.py for free.
2. Detect pages/questions the local parser missed.
3. Fall back to Claude Vision only for those pages.
4. Merge results in page order and write JSON for import.

Usage:
  python hybrid_parse_math_pdf.py --pdf "/path/to/file.pdf"
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional

import pdfplumber
from dotenv import load_dotenv
from pdf2image import convert_from_path

from pdf_parser import extract_questions_from_pdf
from pdf_to_json_claude import (
    DPI,
    HAIKU_MODEL,
    SONNET_MODEL,
    _call_claude,
    _crop,
    _figure_bbox_fractions,
    _pil_to_base64,
)

load_dotenv()

OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON")


def _page_question_id(text: str) -> Optional[str]:
    match = re.search(r"Question\s+ID\s*:?\s*([a-z0-9]+)", text, re.IGNORECASE)
    if not match:
        return None
    return match.group(1).lower()


def _load_page_metadata(pdf_path: Path) -> List[Dict]:
    pages: List[Dict] = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            pages.append(
                {
                    "page_number": index,
                    "question_id": _page_question_id(text),
                    "has_correct_answer": "Correct Answer:" in text,
                    "figure_bbox": _figure_bbox_fractions(page),
                }
            )
    return pages


def _validate_question(question: dict) -> bool:
    options = question.get("options") or []
    return (
        bool(question.get("question_id"))
        and bool(question.get("content"))
        and isinstance(options, list)
        and len(options) == 4
        and all(str(option).strip() for option in options)
        and question.get("correct_answer") in (0, 1, 2, 3)
    )


def _parse_missing_pages(pdf_path: Path, page_metadata: List[Dict], missing_ids: set[str]) -> List[dict]:
    fallback_questions: List[dict] = []
    page_images = convert_from_path(str(pdf_path), dpi=DPI)

    for meta, page_image in zip(page_metadata, page_images):
        question_id = meta.get("question_id")
        if not question_id or question_id not in missing_ids:
            continue

        figure_bbox = meta["figure_bbox"]
        model = SONNET_MODEL if figure_bbox is not None else HAIKU_MODEL
        data = _call_claude(page_image, model=model)
        if data is None or not _validate_question(data):
            print(f"fallback failed on page {meta['page_number']} ({question_id})")
            continue

        crop = figure_bbox
        if crop is None and data.get("has_image") and isinstance(data.get("image_crop"), dict):
            crop = data["image_crop"]
        if crop:
            try:
                cropped = _crop(
                    page_image,
                    top=max(0.0, min(1.0, float(crop.get("top", 0.0)))),
                    left=max(0.0, min(1.0, float(crop.get("left", 0.0)))),
                    bottom=max(0.0, min(1.0, float(crop.get("bottom", 1.0)))),
                    right=max(0.0, min(1.0, float(crop.get("right", 1.0)))),
                )
                data["image"] = _pil_to_base64(cropped)
            except Exception:
                data["image"] = None
        else:
            data["image"] = None

        data.pop("image_crop", None)
        data.pop("has_image", None)
        fallback_questions.append(data)

    return fallback_questions


def process_pdf(pdf_path: Path) -> Dict:
    free_questions = extract_questions_from_pdf(str(pdf_path))
    free_by_id = {q["question_id"]: q for q in free_questions}

    page_metadata = _load_page_metadata(pdf_path)
    page_ids = [meta["question_id"] for meta in page_metadata if meta["question_id"]]
    missing_ids = {
        question_id for question_id in page_ids if question_id not in free_by_id
    }

    print(f"free parse: {len(free_questions)} questions")
    print(f"missing after free parse: {len(missing_ids)}")
    if missing_ids:
        print("missing ids:", ", ".join(sorted(missing_ids)))

    fallback_questions = _parse_missing_pages(pdf_path, page_metadata, missing_ids)
    fallback_by_id = {q["question_id"]: q for q in fallback_questions}

    merged: List[dict] = []
    unresolved: List[str] = []
    for meta in page_metadata:
        question_id = meta["question_id"]
        if not question_id:
            continue
        question = free_by_id.get(question_id) or fallback_by_id.get(question_id)
        if question is None:
            unresolved.append(question_id)
            continue
        merged.append(question)

    return {
        "questions": merged,
        "free_count": len(free_questions),
        "fallback_count": len(fallback_questions),
        "unresolved_ids": unresolved,
        "page_count": len(page_metadata),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Hybrid SAT math PDF parser")
    parser.add_argument("--pdf", required=True, help="Path to the source PDF")
    parser.add_argument(
        "--output",
        help="Optional explicit output path; defaults to Math_JSON/<stem>_hybrid.json",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        raise SystemExit(f"File not found: {pdf_path}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = (
        Path(args.output)
        if args.output
        else OUTPUT_DIR / f"{pdf_path.stem}_hybrid.json"
    )

    result = process_pdf(pdf_path)
    output_path.write_text(
        json.dumps(result["questions"], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"saved: {output_path}")
    print(f"page count: {result['page_count']}")
    print(f"free questions: {result['free_count']}")
    print(f"fallback questions: {result['fallback_count']}")
    print(f"final questions: {len(result['questions'])}")
    if result["unresolved_ids"]:
        print("unresolved ids:", ", ".join(result["unresolved_ids"]))


if __name__ == "__main__":
    main()
