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
from dotenv import load_dotenv

load_dotenv()

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
PDF_DIR    = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math")
OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON")

# ── Config ─────────────────────────────────────────────────────────────────────
DPI          = 150
SONNET_MODEL = "claude-sonnet-4-6"          # for pages with figures (graphs/diagrams/tables)
HAIKU_MODEL  = "claude-haiku-4-5-20251001"  # for plain-text pages (~5x cheaper)
HEADER_BOTTOM_Y    = 120   # tables with top y <= this are the standard metadata header
CROP_PAD_FRAC      = 0.04  # 4% padding on each side of the figure bbox
CROP_TOP_PAD_FRAC  = 0.01  # less padding above — avoids capturing the "Question" header label
PARAGRAPH_X0_MAX   = 30.0  # words starting left of this point are paragraph text, not figure label
MIN_FIGURE_PT      = 60    # raster image must be at least this many pt wide OR tall to count
                           # as a real figure — smaller things are inline math glyphs (π, r², etc.)
MIN_VECTOR_PT      = 20    # vector shape (curve/line/rect) must be this tall/wide to count

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


def _figure_bbox_fractions(plumber_page) -> Optional[dict]:
    """Compute a padded union bbox of all real figures on the page,
    expressed as 0-1 fractions of page size. Returns None if the
    page has no figure.

    Detects:
      - Raster images larger than MIN_FIGURE_PT (filters out inline math glyphs)
      - Vector shapes (curves/lines/rects) taller/wider than MIN_VECTOR_PT
        below the header area (filters out text glyph curves)
      - Tables below the header area
    """
    rects = []

    for img in plumber_page.images:
        # Real figures are taller than a text line. Inline math glyphs are
        # typically <= 22pt tall even when wide ("45π" can be 77pt wide).
        # Also accept smaller-but-square images (small circle diagrams that
        # render under 60pt tall but are still square-ish and far from inline-math
        # aspect ratios).
        if img["height"] >= MIN_FIGURE_PT or (
            img["height"] >= 40 and img["width"] >= 40
            and img["height"] * img["width"] >= 2500
        ):
            rects.append((img["x0"], img["top"], img["x1"], img["bottom"]))

    for shape_attr in ("curves", "lines", "rects"):
        for s in getattr(plumber_page, shape_attr, []):
            if s["top"] <= HEADER_BOTTOM_Y:
                continue  # ignore header decorations
            # Require meaningful vertical extent — filters out \overline{} bars
            # and underscores embedded in body text (height ≈ 0 but width > 20).
            if s.get("height", 0) >= MIN_VECTOR_PT:
                rects.append((s["x0"], s["top"], s["x1"], s["bottom"]))

    for t in plumber_page.find_tables():
        if t.bbox[1] > HEADER_BOTTOM_Y:
            rects.append(tuple(t.bbox))

    if not rects:
        return None
    W, H = float(plumber_page.width), float(plumber_page.height)
    fig_x0 = min(r[0] for r in rects)
    fig_y0 = min(r[1] for r in rects)
    fig_x1 = max(r[2] for r in rects)
    fig_y1 = max(r[3] for r in rects)

    # Extend bbox downward to capture short labels directly under the figure
    # (axis number labels, "Note: Figure not drawn to scale" caption).
    # Stop at the first paragraph text line — recognized by starting at the
    # left margin (the question/answer/rationale body).
    try:
        words = plumber_page.extract_words()
    except Exception:
        words = []
    label_y_max = fig_y1
    label_x0 = fig_x0
    label_x1 = fig_x1
    LABEL_LINE_GAP = 25.0  # max vertical gap between figure and a label line
    LINE_TOL = 3.0         # words within this y-distance are on the same line

    # Pick up small vector glyphs (vertex labels like P, Q, R rendered as curves)
    # that sit immediately below the figure but were too small to be counted as
    # figures themselves.  Tight 15pt gap — vertex labels are 1-8pt from figure
    # edges; body-text math curves are 30+ pt away.
    VERTEX_GAP = 15.0
    for shape_attr in ("curves", "lines", "rects"):
        for s in getattr(plumber_page, shape_attr, []):
            if s["top"] <= HEADER_BOTTOM_Y:
                continue
            if s["top"] <= fig_y1:
                continue
            if s["top"] - fig_y1 > VERTEX_GAP:
                continue
            if s["x1"] < fig_x0 - 10 or s["x0"] > fig_x1 + 10:
                continue
            label_y_max = max(label_y_max, s["bottom"])
            label_x0 = min(label_x0, s["x0"])
            label_x1 = max(label_x1, s["x1"])

    # Group words below the figure into lines, then accept whole lines as labels.
    # A line is a "label" only if NO word on it begins at the left margin
    # (paragraph text starts at x0 < PARAGRAPH_X0_MAX).
    below = sorted([w for w in words if w["top"] > fig_y1], key=lambda w: w["top"])
    i = 0
    while i < len(below):
        line_top = below[i]["top"]
        line_words = []
        while i < len(below) and abs(below[i]["top"] - line_top) < LINE_TOL:
            line_words.append(below[i])
            i += 1
        if line_top - label_y_max > LABEL_LINE_GAP:
            break  # gap too large — labels are over
        if any(w["x0"] < PARAGRAPH_X0_MAX for w in line_words):
            break  # paragraph line — stop before adding it
        for w in line_words:
            label_y_max = max(label_y_max, w["bottom"])
            label_x0 = min(label_x0, w["x0"])
            label_x1 = max(label_x1, w["x1"])

    # Compute a hard minimum y for the crop top — never crop above the nearest
    # "Question" / "Answer" / "Rationale" section label that sits just above
    # the figure (within ~25pt). This prevents the section header from leaking
    # in when the padding is larger than the gap.
    SECTION_LABELS = {"Question", "Answer", "Rationale"}
    min_top_y = 0.0
    for w in words:
        if w["text"].strip() in SECTION_LABELS:
            if 0 < fig_y0 - w["bottom"] < 25:
                min_top_y = max(min_top_y, w["bottom"] + 2)

    # Extend bbox upward to capture axis labels like "y" that sit just above
    # the figure (similar to the downward label extension above).
    label_y_min = fig_y0
    # Also pick up small vector glyphs (axis labels rendered as curves, e.g. 'y')
    # that sit immediately above the figure but were too small to be counted as
    # figures themselves.
    for shape_attr in ("curves", "lines", "rects"):
        for s in getattr(plumber_page, shape_attr, []):
            if s["top"] <= HEADER_BOTTOM_Y:
                continue
            if s["bottom"] >= fig_y0:
                continue
            if fig_y0 - s["bottom"] > LABEL_LINE_GAP:
                continue
            # only within the figure's horizontal span (avoid catching unrelated marks)
            if s["x1"] < fig_x0 - 10 or s["x0"] > fig_x1 + 10:
                continue
            label_y_min = min(label_y_min, s["top"])
    above = sorted([w for w in words if w["bottom"] < fig_y0], key=lambda w: -w["bottom"])
    j = 0
    while j < len(above):
        line_bot = above[j]["bottom"]
        line_words = []
        while j < len(above) and abs(above[j]["bottom"] - line_bot) < LINE_TOL:
            line_words.append(above[j])
            j += 1
        if label_y_min - line_bot > LABEL_LINE_GAP:
            break
        if any(w["x0"] < PARAGRAPH_X0_MAX for w in line_words):
            break
        if any(w["text"].strip() in SECTION_LABELS for w in line_words):
            break
        for w in line_words:
            label_y_min = min(label_y_min, w["top"])
            label_x0 = min(label_x0, w["x0"])
            label_x1 = max(label_x1, w["x1"])

    p = CROP_PAD_FRAC
    pad_top_y = label_y_min - CROP_TOP_PAD_FRAC * H
    top_y = max(pad_top_y, min_top_y)
    # Only pad the bottom when label extension actually picked up something
    # (axis numbers / caption). If we stopped immediately at paragraph text,
    # extra padding would bleed the question text into the crop.
    bottom_pad = CROP_TOP_PAD_FRAC if label_y_max > fig_y1 + 0.5 else 0.0

    return {
        "left":   max(0.0, label_x0 / W - p),
        "top":    max(0.0, top_y / H),
        "right":  min(1.0, label_x1 / W + p),
        "bottom": min(1.0, label_y_max / H + bottom_pad),
    }


def _call_claude(page_image, model: str, retries: int = 3) -> Optional[dict]:
    img_b64 = _pil_to_base64(page_image)

    for attempt in range(retries):
        try:
            resp = client.messages.create(
                model=model,
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
def process_pdf(pdf_path: Path, max_pages: Optional[int] = None) -> list[dict]:
    print(f"\n{'─'*60}")
    print(f"  {pdf_path.name}")

    pages = convert_from_path(str(pdf_path), dpi=DPI)
    if max_pages:
        pages = pages[:max_pages]

    # Pre-scan with pdfplumber to find figure bboxes and decide model per page
    with pdfplumber.open(str(pdf_path)) as pdf_plumb:
        figure_bboxes: list[Optional[dict]] = [
            _figure_bbox_fractions(p) for p in pdf_plumb.pages[: len(pages)]
        ]
    n_vision = sum(1 for b in figure_bboxes if b is not None)
    print(f"  {len(pages)} pages  ({n_vision} need Sonnet vision, {len(pages) - n_vision} → Haiku)")

    questions: list[dict] = []
    seen_ids: set[str] = set()
    counts = {"sonnet": 0, "haiku": 0}

    for i, page_img in enumerate(pages):
        fig_bbox = figure_bboxes[i]
        use_sonnet = fig_bbox is not None
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
            print(f"dup")
            continue
        seen_ids.add(qid)

        opts = data.get("options") or []
        if not isinstance(opts, list) or len(opts) != 4 or any(not str(o).strip() for o in opts):
            print(f"bad-opts")
            continue
        if data.get("correct_answer") not in (0, 1, 2, 3):
            print("bad-ans")
            continue

        # Crop figure using pdfplumber-derived bbox (pixel-accurate).
        # Fall back to Claude's image_crop only if pdfplumber missed something
        # the model still flagged.
        crop = fig_bbox
        if crop is None and data.get("has_image") and isinstance(data.get("image_crop"), dict):
            crop = data["image_crop"]
        if crop:
            try:
                cropped = _crop(
                    page_img,
                    top    = max(0.0, min(1.0, float(crop.get("top",    0.0)))),
                    left   = max(0.0, min(1.0, float(crop.get("left",   0.0)))),
                    bottom = max(0.0, min(1.0, float(crop.get("bottom", 1.0)))),
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
    parser = argparse.ArgumentParser(description="PDF → JSON via Claude vision")
    parser.add_argument("--pdf",    help="Process a single PDF")
    parser.add_argument("--resume", action="store_true", help="Skip already-processed PDFs")
    parser.add_argument("--max-pages", type=int, help="Process only the first N pages (for testing)")
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

        questions = process_pdf(pdf_path, max_pages=args.max_pages)

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
