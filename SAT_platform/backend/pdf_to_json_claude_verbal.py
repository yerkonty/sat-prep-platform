#!/usr/bin/env python3
"""
Convert College Board Verbal/RW PDFs to structured JSON using Claude vision.

Renders each PDF page as an image, sends to Claude, and extracts:
  - Question ID, skill, domain, difficulty
  - Full passage text + question stem (content field)
  - A/B/C/D options, correct answer, explanation
  - Cropped base64 image of any embedded table/chart/figure

Usage:
  python pdf_to_json_claude_verbal.py                  # process all 10 Verbal PDFs
  python pdf_to_json_claude_verbal.py --pdf path/to.pdf  # single PDF
  python pdf_to_json_claude_verbal.py --resume           # skip already-done PDFs
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

try:
    import pdfplumber
except ImportError:
    print("Missing: pip install pdfplumber")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────────
PDF_DIR    = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Verbal")
OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Verbal_JSON")

# ── Config ─────────────────────────────────────────────────────────────────────
DPI          = 150
SONNET_MODEL = "claude-sonnet-4-6"          # used only for pages with figures/data tables
HAIKU_MODEL  = "claude-haiku-4-5-20251001"  # used for plain-text pages (~5x cheaper)
HEADER_BOTTOM_Y = 120  # tables with top y <= this are the standard metadata header

# ── Prompts ────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are a precise data extractor for College Board SAT Reading and Writing questions. "
    "You receive an image of a single PDF page and return structured JSON. "
    "Never add commentary or markdown."
)

EXTRACTION_PROMPT = """\
Extract the SAT Reading and Writing question from this College Board page image.

The page contains these sections (in order): "Question ID: <hex>", a header row with Domain/Skill/Difficulty, "Question" header, the question body text, "Answer" header, four lines starting "A.", "B.", "C.", "D.", "Correct Answer: X", "Rationale" header, the rationale text. Extract them all.

Return a single JSON object:
{
  "question_id":    "hex ID after 'Question ID:' (lowercase)",
  "skill":          "skill name from header row — one of: 'Boundaries', 'Form, Structure, and Sense', 'Central Ideas and Details', 'Inferences', 'Command of Evidence (Textual)', 'Command of Evidence (Quantitative)', 'Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections', 'Transitions', 'Rhetorical Synthesis'",
  "domain":         "domain from header row — one of: 'Information and Ideas', 'Craft and Structure', 'Expression of Ideas', 'Standard English Conventions'",
  "difficulty":     "easy" | "medium" | "hard",
  "section":        "reading_writing",
  "passage_type":   "dual" if the page contains both 'Text 1' and 'Text 2' labelled passages, otherwise "single",
  "content":        "Everything between the 'Question' header and the 'Answer' header (the question body), verbatim. This is whatever the student reads — could be a sentence with a blank, a paragraph passage, dual texts, notes for synthesis, etc. Do NOT include the A/B/C/D answer lines.",
  "options":        ["text after 'A.'", "text after 'B.'", "text after 'C.'", "text after 'D.'"],
  "correct_answer": 0,
  "explanation":    "Full Rationale text verbatim",
  "has_image":      true ONLY if a chart/graph/table/diagram/figure is drawn on the page (rare for RW; never true for plain text questions),
  "image_crop":     if has_image, {"top": 0.0, "left": 0.0, "bottom": 0.5, "right": 1.0} tightly bounding the figure, else null
}

Rules:
- correct_answer: 0=A, 1=B, 2=C, 3=D (read the letter after "Correct Answer:")
- ALWAYS extract if the page has the structure described above. Most pages will have a question — extract it.
- Boundaries / Form Structure Sense questions are a single sentence with a blank like "______" and a question stem — that whole block is the content.
- Skill "Command of Evidence" appears as "Command of Evidence (Textual)" or "Command of Evidence (Quantitative)" — use exactly that form.
- CRITICAL JSON SAFETY: inside any string value, you MUST replace every double-quote character (") with a single quote ('). The PDF often contains quoted text like "luminous simplicity" — render these as 'luminous simplicity' in your output. Never emit a raw " inside a string value. Failing this rule will break the entire response.
- Inside string values, escape backslashes as \\\\ and newlines as \\n. Never emit a literal newline inside a string.
- Return null ONLY if: page is a cover/title/blank page, OR the question has no A-D multiple choice (e.g. student-produced response).
- Return ONLY the JSON object or the word null. No markdown fences.\
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


_LAST_PARSE_ERROR: Optional[str] = None


def _parse_json(text: str) -> Optional[dict]:
    global _LAST_PARSE_ERROR
    _LAST_PARSE_ERROR = None
    text = text.strip()
    if text.lower() in ("null", "none", ""):
        return None
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Try strict, then lenient (allows control chars in strings)
    for strict in (True, False):
        try:
            return json.loads(text, strict=strict)
        except json.JSONDecodeError as exc:
            _LAST_PARSE_ERROR = f"{exc.msg} at line {exc.lineno} col {exc.colno}"
    # Last resort: extract outermost {...} block
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(), strict=False)
        except json.JSONDecodeError as exc:
            _LAST_PARSE_ERROR = f"{exc.msg} at line {exc.lineno} col {exc.colno}"
    return None


DEBUG = False


def _page_needs_vision(plumber_page) -> bool:
    """True if page contains a figure/chart/data-table (needs Sonnet vision)."""
    if plumber_page.images:
        return True
    for t in plumber_page.find_tables():
        # Standard header (Domain/Skill/Difficulty) sits at top of page; anything
        # below that is a real data table or chart bounding box.
        if t.bbox[1] > HEADER_BOTTOM_Y:
            return True
    return False


def _call_claude(page_image, model: str, retries: int = 3) -> Optional[dict]:
    img_b64 = _pil_to_base64(page_image)
    prompt_text = EXTRACTION_PROMPT

    for attempt in range(retries):
        if attempt > 0 and _LAST_PARSE_ERROR:
            prompt_text = EXTRACTION_PROMPT + (
                "\n\nYour previous response was INVALID JSON. Error: "
                + _LAST_PARSE_ERROR
                + "\nRemember: replace every \" inside string values with ' (single quote). "
                + "Try again and produce strictly valid JSON."
            )
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=8192,
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
                            {
                                "type": "text",
                                "text": prompt_text,
                                "cache_control": {"type": "ephemeral"},
                            },
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
            raw = resp.content[0].text
            parsed = _parse_json(raw)
            if parsed is not None:
                return parsed
            if DEBUG:
                stop = getattr(resp, "stop_reason", "?")
                print(f"\n  [DEBUG attempt={attempt+1} stop={stop} len={len(raw)} err={_LAST_PARSE_ERROR}]", end="")
            # If JSON parse failed but we still have retries, loop will re-prompt
            if attempt == retries - 1:
                return None
            continue

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
def process_pdf(pdf_path: Path, max_pages: Optional[int] = None) -> list[dict]:
    print(f"\n{'─'*60}")
    print(f"  {pdf_path.name}")

    pages = convert_from_path(str(pdf_path), dpi=DPI)
    if max_pages:
        pages = pages[:max_pages]

    # Pre-scan each page with pdfplumber to decide which model to use.
    with pdfplumber.open(str(pdf_path)) as pdf_plumb:
        plumb_pages = pdf_plumb.pages[: len(pages)]
        needs_vision = [_page_needs_vision(p) for p in plumb_pages]
    n_vision = sum(needs_vision)
    print(f"  {len(pages)} pages  ({n_vision} need Sonnet vision, {len(pages) - n_vision} → Haiku)")

    questions: list[dict] = []
    seen_ids: set[str] = set()
    counts = {"sonnet": 0, "haiku": 0}

    for i, page_img in enumerate(pages):
        use_sonnet = needs_vision[i]
        model = SONNET_MODEL if use_sonnet else HAIKU_MODEL
        tag = "S" if use_sonnet else "H"
        counts["sonnet" if use_sonnet else "haiku"] += 1
        print(f"  p{i+1:3d}/{len(pages)} [{tag}] ", end="", flush=True)

        data = _call_claude(page_img, model=model)

        if data is None:
            print("—")
            continue

        qid = str(data.get("question_id", "")).lower().strip()
        if not qid:
            print("no ID")
            continue
        if qid in seen_ids:
            print("dup")
            continue
        seen_ids.add(qid)

        opts = data.get("options", [])
        if len(opts) != 4 or any(not str(o).strip() for o in opts):
            print("bad-opts")
            continue
        if data.get("correct_answer") not in (0, 1, 2, 3):
            print("bad-ans")
            continue
        if not data.get("content", "").strip():
            print("no-content")
            continue

        # Crop embedded figure if Claude found one
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

    print(f"  models used: Sonnet={counts['sonnet']}  Haiku={counts['haiku']}")
    return questions


def main() -> None:
    parser = argparse.ArgumentParser(description="Verbal PDF → JSON via Claude vision")
    parser.add_argument("--pdf",    help="Process a single PDF")
    parser.add_argument("--resume", action="store_true", help="Skip already-processed PDFs")
    parser.add_argument("--debug",  action="store_true", help="Print raw Claude response when extraction returns null")
    parser.add_argument("--max-pages", type=int, help="Process only the first N pages of each PDF (for testing)")
    args = parser.parse_args()

    global DEBUG
    DEBUG = bool(args.debug)

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

        questions = process_pdf(pdf_path, max_pages=args.max_pages)

        out_file.write_text(
            json.dumps(questions, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        imgs = sum(1 for q in questions if q.get("image"))
        total_with_image += imgs
        all_questions.extend(questions)
        print(f"  → saved {len(questions)} questions ({imgs} with image) → {out_file.name}")

    combined = OUTPUT_DIR / "all_verbal_questions.json"
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
