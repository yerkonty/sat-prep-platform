#!/usr/bin/env python3
"""
Convert College Board math PDFs to structured JSON using Claude vision.

Renders each PDF page as an image, sends to Claude, and extracts:
  - Question content with proper LaTeX math notation
  - A/B/C/D options with LaTeX
  - Correct answer, explanation, skill, domain, difficulty
  - Cropped base64 image of any graph/diagram/figure

Usage:
  python pdf_to_json_claude.py                      # process all 19 PDFs
  python pdf_to_json_claude.py --pdf path/to.pdf    # single PDF
  python pdf_to_json_claude.py --resume             # skip already-done PDFs
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

try:
    from pdf2image import convert_from_path
except ImportError:
    print("Missing: pip install pdf2image")
    print("Also:    sudo apt-get install poppler-utils")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────────
PDF_DIR    = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math")
OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON")

# ── Config ─────────────────────────────────────────────────────────────────────
DPI   = 150   # 150 is sharp enough for Claude; higher costs more tokens
MODEL = "claude-sonnet-4-6"

# ── Prompts ────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a precise data extractor for College Board SAT math questions. "
    "You receive an image of a single PDF page and return structured JSON. "
    "Always use LaTeX for math. Never add commentary."
)

EXTRACTION_PROMPT = """\
Extract the SAT math question from this page image and return a single JSON object.

Required fields:
{
  "question_id":   "hex ID after 'Question ID:' (lowercase, e.g. 'a1b2c3d4')",
  "skill":         "Skill value from the header row (e.g. 'Nonlinear functions')",
  "domain":        "Domain value from the header row (e.g. 'Advanced Math')",
  "difficulty":    "easy" | "medium" | "hard",
  "section":       "math",
  "content":       "Question stem — NO answer choices. ALL math in LaTeX: inline $x^2$ or display $$y=mx+b$$",
  "options":       ["choice A text", "choice B text", "choice C text", "choice D text"],
  "correct_answer": 0,
  "explanation":   "Full Rationale text. Use LaTeX for all math.",
  "has_image":     true if there is a graph, chart, coordinate plane, table, or diagram in the question,
  "image_crop":    if has_image, {"top": 0.0, "left": 0.0, "bottom": 0.4, "right": 1.0} as 0.0-1.0 fractions of page size, else null
}

Rules:
- correct_answer: 0=A, 1=B, 2=C, 3=D
- Use LaTeX for ALL math: variables, fractions, exponents, equations, inequalities, symbols
- image_crop must tightly bound the graph/figure only (not the full question text)
- Return null if: no question on this page, OR question has no A-D choices (Student-Produced Response)
- Return ONLY the JSON object or the word null. No markdown, no explanation.\
"""


# ── Helpers ────────────────────────────────────────────────────────────────────
client = anthropic.Anthropic()


def _pil_to_base64(image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return base64.standard_b64encode(buf.getvalue()).decode()


def _crop(image, top: float, left: float, bottom: float, right: float):
    w, h = image.size
    return image.crop((
        int(left  * w), int(top    * h),
        int(right * w), int(bottom * h),
    ))


def _parse_json(text: str) -> Optional[dict]:
    text = text.strip()
    if text.lower() in ("null", "none", ""):
        return None
    # strip optional markdown fences
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # last-resort: find outermost {...}
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except json.JSONDecodeError:
                pass
    return None


def _call_claude(page_image, retries: int = 3) -> Optional[dict]:
    img_b64 = _pil_to_base64(page_image)

    for attempt in range(retries):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=2048,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            # constant extraction prompt cached first
                            {
                                "type": "text",
                                "text": EXTRACTION_PROMPT,
                                "cache_control": {"type": "ephemeral"},
                            },
                            # variable page image
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": img_b64,
                                },
                            },
                        ],
                    }
                ],
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


# ── Core ───────────────────────────────────────────────────────────────────────
def process_pdf(pdf_path: Path) -> list[dict]:
    print(f"\n{'─'*60}")
    print(f"  {pdf_path.name}")

    pages = convert_from_path(str(pdf_path), dpi=DPI)
    print(f"  {len(pages)} pages")

    questions: list[dict] = []
    seen_ids: set[str] = set()

    for i, page_img in enumerate(pages):
        print(f"  p{i+1:3d}/{len(pages)} ", end="", flush=True)

        data = _call_claude(page_img)

        if data is None:
            print("—")
            continue

        qid = str(data.get("question_id", "")).lower().strip()
        if not qid:
            print("no ID")
            continue
        if qid in seen_ids:
            print(f"dup")
            continue
        seen_ids.add(qid)

        opts = data.get("options", [])
        if len(opts) != 4 or any(not str(o).strip() for o in opts):
            print(f"bad-opts")
            continue
        if data.get("correct_answer") not in (0, 1, 2, 3):
            print("bad-ans")
            continue

        # Crop graph image from the page if Claude found one
        if data.get("has_image") and isinstance(data.get("image_crop"), dict):
            crop = data["image_crop"]
            try:
                cropped = _crop(
                    page_img,
                    top    = max(0.0, min(1.0, float(crop.get("top",    0.0)))),
                    left   = max(0.0, min(1.0, float(crop.get("left",   0.0)))),
                    bottom = max(0.0, min(1.0, float(crop.get("bottom", 0.5)))),
                    right  = max(0.0, min(1.0, float(crop.get("right",  1.0)))),
                )
                data["image"] = _pil_to_base64(cropped)
                print(f"OK+img  [{qid[:8]}]")
            except Exception as exc:
                print(f"OK(crop-err:{exc})  [{qid[:8]}]")
                data["image"] = None
        else:
            data["image"] = None
            print(f"OK  [{qid[:8]}]")

        data.pop("image_crop", None)
        data.pop("has_image", None)
        questions.append(data)

    return questions


def main() -> None:
    parser = argparse.ArgumentParser(description="PDF → JSON via Claude vision")
    parser.add_argument("--pdf",    help="Process a single PDF")
    parser.add_argument("--resume", action="store_true", help="Skip already-processed PDFs")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    pdfs = [Path(args.pdf)] if args.pdf else sorted(PDF_DIR.glob("*.pdf"))
    print(f"PDFs to process: {len(pdfs)}")
    print(f"Output dir:      {OUTPUT_DIR}")

    all_questions: list[dict] = []
    total_with_image = 0

    for pdf_path in pdfs:
        out_file = OUTPUT_DIR / (pdf_path.stem + ".json")

        if args.resume and out_file.exists():
            existing: list[dict] = json.loads(out_file.read_text(encoding="utf-8"))
            imgs = sum(1 for q in existing if q.get("image"))
            print(f"\nSKIP (exists): {pdf_path.name}  ({len(existing)} questions, {imgs} with image)")
            all_questions.extend(existing)
            total_with_image += imgs
            continue

        questions = process_pdf(pdf_path)

        out_file.write_text(
            json.dumps(questions, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        imgs = sum(1 for q in questions if q.get("image"))
        total_with_image += imgs
        all_questions.extend(questions)
        print(f"  → saved {len(questions)} questions ({imgs} with image) → {out_file.name}")

    combined = OUTPUT_DIR / "all_math_questions.json"
    combined.write_text(
        json.dumps(all_questions, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\n{'═'*60}")
    print(f"Total questions : {len(all_questions)}")
    print(f"With images     : {total_with_image}")
    print(f"Without images  : {len(all_questions) - total_with_image}")
    print(f"Combined JSON   : {combined}")
    print(f"\nNext step: python import_json_questions.py {combined}")


if __name__ == "__main__":
    main()
