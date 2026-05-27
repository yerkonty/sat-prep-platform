#!/usr/bin/env python3
"""
Targeted Claude parser for selected SAT math PDF pages.

Use this to avoid running a full-PDF Claude pass when we already know which
pages are MCQ or SPR candidates.

Examples:
  python targeted_claude_math_parse.py --pdf "/path/to/file.pdf" --pages 1,2,5 --mode mcq --output out.json
  python targeted_claude_math_parse.py --pdf "/path/to/file.pdf" --pages 8,10,16 --mode spr --output out_spr.json
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

import pdfplumber
from pdf2image import convert_from_path

from pdf_to_json_claude import (
    DPI,
    HAIKU_MODEL,
    SONNET_MODEL,
    _call_claude as mcq_call_claude,
    _crop,
    _figure_bbox_fractions,
    _pil_to_base64,
)
from pdf_to_json_claude_spr import _call_claude as spr_call_claude


def _parse_pages(raw: str) -> list[int]:
    values: list[int] = []
    for chunk in raw.split(","):
        piece = chunk.strip()
        if not piece:
            continue
        if "-" in piece:
            start_text, end_text = piece.split("-", 1)
            start = int(start_text)
            end = int(end_text)
            if end < start:
                raise ValueError(f"Invalid page range: {piece}")
            values.extend(range(start, end + 1))
        else:
            values.append(int(piece))
    return sorted(set(values))


def _iter_target_pages(pdf_path: Path, pages: Iterable[int]):
    with pdfplumber.open(str(pdf_path)) as doc:
        for page_number in pages:
            plumber_page = doc.pages[page_number - 1]
            page_image = convert_from_path(
                str(pdf_path),
                dpi=DPI,
                first_page=page_number,
                last_page=page_number,
            )[0]
            yield page_number, plumber_page, page_image


def _normalize_mcq(data: dict, page_image, figure_bbox: dict | None) -> dict:
    entry = {
        "question_id": str(data.get("question_id", "")).lower().strip(),
        "skill": data.get("skill", ""),
        "domain": data.get("domain", ""),
        "difficulty": str(data.get("difficulty", "medium")).lower(),
        "section": "math",
        "content": data.get("content", ""),
        "options": data.get("options", []),
        "correct_answer": int(data.get("correct_answer", 0)),
        "explanation": data.get("explanation", ""),
    }
    if figure_bbox:
        try:
            cropped = _crop(
                page_image,
                top=max(0.0, min(1.0, float(figure_bbox["top"]))),
                left=max(0.0, min(1.0, float(figure_bbox["left"]))),
                bottom=max(0.0, min(1.0, float(figure_bbox["bottom"]))),
                right=max(0.0, min(1.0, float(figure_bbox["right"]))),
            )
            entry["image"] = _pil_to_base64(cropped)
        except Exception:
            entry["image"] = None
    else:
        entry["image"] = None
    return entry


def _normalize_spr(data: dict, page_image, figure_bbox: dict | None) -> dict:
    entry = {
        "question_id": str(data.get("question_id", "")).lower().strip(),
        "skill": data.get("skill", ""),
        "domain": data.get("domain", ""),
        "difficulty": str(data.get("difficulty", "medium")).lower(),
        "section": "math",
        "content": data.get("content", ""),
        "options": [str(data.get("correct_answer_text", "")).strip()],
        "correct_answer": 0,
        "explanation": data.get("explanation", ""),
    }
    if figure_bbox:
        try:
            cropped = _crop(
                page_image,
                top=max(0.0, min(1.0, float(figure_bbox["top"]))),
                left=max(0.0, min(1.0, float(figure_bbox["left"]))),
                bottom=max(0.0, min(1.0, float(figure_bbox["bottom"]))),
                right=max(0.0, min(1.0, float(figure_bbox["right"]))),
            )
            entry["image"] = _pil_to_base64(cropped)
        except Exception:
            entry["image"] = None
    else:
        entry["image"] = None
    return entry


def process(pdf_path: Path, pages: list[int], mode: str) -> list[dict]:
    results: list[dict] = []
    seen_ids: set[str] = set()
    caller = mcq_call_claude if mode == "mcq" else spr_call_claude

    for page_number, plumber_page, page_image in _iter_target_pages(pdf_path, pages):
        figure_bbox = _figure_bbox_fractions(plumber_page)
        model = SONNET_MODEL if figure_bbox is not None else HAIKU_MODEL
        tag = "S" if model == SONNET_MODEL else "H"
        print(f"p{page_number:03d} [{tag}] ", end="", flush=True)

        data = caller(page_image, model=model)
        if data is None:
            print("null")
            continue

        question_id = str(data.get("question_id", "")).lower().strip()
        if not question_id:
            print("no-id")
            continue
        if question_id in seen_ids:
            print(f"dup {question_id}")
            continue

        if mode == "mcq":
            options = data.get("options")
            if not isinstance(options, list) or len(options) != 4:
                print(f"skip-invalid-options {question_id}")
                continue
            if data.get("correct_answer") not in (0, 1, 2, 3):
                print(f"skip-invalid-answer {question_id}")
                continue
            entry = _normalize_mcq(data, page_image, figure_bbox)
        else:
            answer_text = str(data.get("correct_answer_text", "")).strip()
            if not answer_text:
                print(f"skip-no-answer {question_id}")
                continue
            entry = _normalize_spr(data, page_image, figure_bbox)

        seen_ids.add(question_id)
        results.append(entry)
        print(f"ok {question_id}")

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Targeted Claude parser for selected math PDF pages")
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--pages", required=True, help="Comma-separated pages or ranges, e.g. 1,2,5-8")
    parser.add_argument("--mode", choices=["mcq", "spr"], required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    pages = _parse_pages(args.pages)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    results = process(pdf_path, pages, args.mode)
    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"saved {len(results)} -> {output_path}")


if __name__ == "__main__":
    main()
