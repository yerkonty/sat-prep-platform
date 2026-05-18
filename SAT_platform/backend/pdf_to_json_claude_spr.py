#!/usr/bin/env python3
"""
Extract Student-Produced Response (SPR) questions from a College Board math PDF.

This is a focused companion to pdf_to_json_claude.py, which intentionally skips
SPR questions (no A-D choices). Here we keep only those.

Output JSON entries use a 1-element `options` array containing the correct
numeric/text answer, with `correct_answer: 0`. The frontend treats any
question with `options.length <= 1` as free-response.

Usage:
  python pdf_to_json_claude_spr.py --pdf "/path/to/Area and volume.pdf"
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import time
from pathlib import Path
from typing import Optional

import anthropic
from dotenv import load_dotenv

load_dotenv()

try:
    from pdf2image import convert_from_path
except ImportError:
    print("Missing: pip install pdf2image")
    sys.exit(1)

try:
    import pdfplumber
except ImportError:
    print("Missing: pip install pdfplumber")
    sys.exit(1)

# Reuse helpers from the main pipeline.
from pdf_to_json_claude import (
    DPI,
    SONNET_MODEL,
    HAIKU_MODEL,
    _pil_to_base64,
    _crop,
    _parse_json,
    _figure_bbox_fractions,
)

OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON")

SYSTEM_PROMPT = (
    "You are a precise data extractor for College Board SAT math questions. "
    "You receive an image of a single PDF page and return structured JSON. "
    "Always use LaTeX for math. Never add commentary."
)

EXTRACTION_PROMPT = """\
Extract the SAT math question from this page image IF AND ONLY IF it is a
Student-Produced Response (SPR) question — meaning the student writes a
numeric answer themselves. SPR pages have NO A/B/C/D answer choices; the
"Correct Answer:" line contains a number, fraction, or decimal (sometimes
several acceptable forms separated by a comma).

Return a single JSON object with these fields:
{
  "question_id":     "hex ID after 'Question ID:' (lowercase)",
  "skill":           "Skill from the header row (e.g. 'Area and volume')",
  "domain":          "Domain from the header row (e.g. 'Geometry and Trigonometry')",
  "difficulty":      "easy" | "medium" | "hard",
  "section":         "math",
  "content":         "Question stem. ALL math in LaTeX: inline $x^2$ or display $$y=mx+b$$",
  "correct_answer_text": "the SPR answer exactly as shown after 'Correct Answer:' (digits/fraction/decimal, no LaTeX wrappers)",
  "explanation":     "Full Rationale text. LaTeX for all math.",
  "has_image":       true if there is a graph/chart/diagram/figure (not inline glyphs)
}

Rules:
- Return null if the page has A/B/C/D multiple-choice options.
- Return null if the page has no question at all.
- Do NOT invent options. SPR questions have a free-response answer only.
- correct_answer_text: keep multiple acceptable forms if the PDF lists them,
  separated by a comma (e.g. "1/2, 0.5").
- Return ONLY the JSON object or the word null. No markdown.\
"""

client = anthropic.Anthropic()


def _call_claude(page_image, model: str, retries: int = 3) -> Optional[dict]:
    img_b64 = _pil_to_base64(page_image)
    for attempt in range(retries):
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=2048,
                system=[{"type": "text", "text": SYSTEM_PROMPT,
                         "cache_control": {"type": "ephemeral"}}],
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT,
                         "cache_control": {"type": "ephemeral"}},
                        {"type": "image", "source": {
                            "type": "base64", "media_type": "image/png", "data": img_b64,
                        }},
                    ],
                }],
            )
            return _parse_json(resp.content[0].text)
        except anthropic.RateLimitError:
            wait = 5 * (2 ** attempt)
            print(f" [rate-limit, retrying in {wait}s]", end="", flush=True)
            time.sleep(wait)
        except Exception as e:
            if attempt == retries - 1:
                print(f" [error: {e}]", end="", flush=True)
                return None
            time.sleep(2 ** attempt)
    return None


def process_pdf(pdf_path: Path) -> list[dict]:
    print(f"\n{'─'*60}\n  {pdf_path.name}")
    pages = convert_from_path(str(pdf_path), dpi=DPI)

    with pdfplumber.open(str(pdf_path)) as pdf_plumb:
        figure_bboxes: list[Optional[dict]] = [
            _figure_bbox_fractions(p) for p in pdf_plumb.pages[: len(pages)]
        ]

    n_vision = sum(1 for b in figure_bboxes if b is not None)
    print(f"  {len(pages)} pages  ({n_vision} Sonnet, {len(pages) - n_vision} Haiku)")

    questions: list[dict] = []
    seen_ids: set[str] = set()

    for i, page_img in enumerate(pages):
        fig_bbox = figure_bboxes[i]
        use_sonnet = fig_bbox is not None
        model = SONNET_MODEL if use_sonnet else HAIKU_MODEL
        tag = "S" if use_sonnet else "H"
        print(f"  p{i+1:3d}/{len(pages)} [{tag}] ", end="", flush=True)

        data = _call_claude(page_img, model=model)
        if data is None:
            print("— (MC or no question)")
            continue

        qid = str(data.get("question_id", "")).lower().strip()
        if not qid:
            print("no ID")
            continue
        if qid in seen_ids:
            print("dup")
            continue

        answer_text = str(data.get("correct_answer_text", "")).strip()
        if not answer_text:
            print("no answer text")
            continue

        seen_ids.add(qid)

        # Reshape to importer format: 1-element options list.
        entry = {
            "question_id":   qid,
            "skill":         data.get("skill", ""),
            "domain":        data.get("domain", ""),
            "difficulty":    str(data.get("difficulty", "medium")).lower(),
            "section":       "math",
            "content":       data.get("content", ""),
            "options":       [answer_text],
            "correct_answer": 0,
            "explanation":   data.get("explanation", ""),
        }

        if fig_bbox:
            try:
                cropped = _crop(
                    page_img,
                    top    = max(0.0, min(1.0, float(fig_bbox["top"]))),
                    left   = max(0.0, min(1.0, float(fig_bbox["left"]))),
                    bottom = max(0.0, min(1.0, float(fig_bbox["bottom"]))),
                    right  = max(0.0, min(1.0, float(fig_bbox["right"]))),
                )
                entry["image"] = _pil_to_base64(cropped)
                print(f"OK+img  [{qid[:8]}] ans={answer_text!r}")
            except Exception as exc:
                entry["image"] = None
                print(f"OK(crop-err:{exc})  [{qid[:8]}] ans={answer_text!r}")
        else:
            entry["image"] = None
            print(f"OK  [{qid[:8]}] ans={answer_text!r}")

        questions.append(entry)

    return questions


def main() -> None:
    parser = argparse.ArgumentParser(description="SPR-only PDF → JSON via Claude vision")
    parser.add_argument("--pdf", required=True)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = Path(args.pdf)
    out_file = OUTPUT_DIR / (pdf_path.stem + "_SPR.json")

    questions = process_pdf(pdf_path)
    out_file.write_text(json.dumps(questions, indent=2, ensure_ascii=False), encoding="utf-8")

    imgs = sum(1 for q in questions if q.get("image"))
    print(f"\n{'═'*60}")
    print(f"SPR questions   : {len(questions)}")
    print(f"With images     : {imgs}")
    print(f"Output          : {out_file}")
    print(f"\nNext: python import_spr_questions.py {out_file}")


if __name__ == "__main__":
    main()
