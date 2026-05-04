#!/usr/bin/env python3
"""
Extract figure/diagram images from SAT math PDF pages.

Strategy: each PDF page has the layout:
  [header: ID | Skill | Domain | Difficulty]
  Question                  ← section label
  [FIGURE HERE]             ← graph / diagram / table
  Question text starts...   ← first real sentence

We locate "Question" label via pdfplumber word coords, then find where
the next text block begins — the vertical gap between them is the figure.
We crop exactly that strip (full page width) from the pdf2image render.

This captures both raster images AND vector graphics (which pdfplumber
.images misses).

Output: Math_JSON/images.json  { question_id: base64_png }

Usage:
  python extract_page_images.py
  python extract_page_images.py --pdf path/to/file.pdf
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
from pathlib import Path

import pdfplumber
from pdf2image import convert_from_path

PDF_DIR     = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math")
OUTPUT_DIR  = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON")
OUTPUT_FILE = OUTPUT_DIR / "images.json"

DPI = 200
# Minimum vertical gap (PDF points) between "Question" label and question text
# for us to consider a figure is present. ~40 pt ≈ 0.55 inch.
MIN_FIGURE_GAP_PT = 40
PADDING_PT = 6   # small padding above/below the crop


def get_question_id(page) -> str | None:
    text = page.extract_text() or ""
    m = re.search(r"Question\s+ID\s*:?\s*([a-f0-9]+)", text, re.IGNORECASE)
    return m.group(1).lower() if m else None


def find_figure_region(page) -> tuple[float, float] | None:
    """
    Return (top_pt, bottom_pt) of the figure gap between the "Question"
    section label and the start of the question body text.
    Returns None if no significant gap (= no figure).
    """
    words = page.extract_words() or []
    if not words:
        return None

    words_sorted = sorted(words, key=lambda w: w["top"])

    # Find the "Question" section label — it appears alone (not "Question ID:")
    question_bottom = None
    for i, w in enumerate(words_sorted):
        if w["text"].strip().lower() != "question":
            continue
        # Make sure the next word on the same line is not "ID" (header row)
        same_line = [
            x for x in words_sorted
            if abs(x["top"] - w["top"]) < 4 and x is not w
        ]
        next_texts = [x["text"].strip().lower() for x in same_line]
        if "id" in next_texts or any(t.startswith("id") for t in next_texts):
            continue
        question_bottom = w["bottom"]
        break

    if question_bottom is None:
        return None

    # First word of actual question content (below the "Question" label)
    below = [w for w in words_sorted if w["top"] > question_bottom + 4]
    if not below:
        return None

    first_text_top = below[0]["top"]
    gap = first_text_top - question_bottom

    if gap < MIN_FIGURE_GAP_PT:
        return None   # no figure — text follows immediately

    # Return the figure strip with small padding
    top = max(0, question_bottom + PADDING_PT)
    bottom = min(page.height, first_text_top - PADDING_PT)
    return top, bottom


def crop_figure(page, pil_image, fig_top_pt: float, fig_bot_pt: float):
    """Crop the full-width figure strip from the rendered PIL image."""
    pw, ph = pil_image.size
    sy = ph / page.height
    py0 = int(fig_top_pt * sy)
    py1 = int(fig_bot_pt * sy)
    return pil_image.crop((0, py0, pw, py1))


def pil_to_base64(image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def process_pdf(pdf_path: Path, images: dict) -> int:
    print(f"\n  {pdf_path.name}")

    with pdfplumber.open(str(pdf_path)) as pdf:
        candidate_pages: list[tuple[int, str, float, float]] = []
        for i, page in enumerate(pdf.pages):
            qid = get_question_id(page)
            if not qid:
                continue
            region = find_figure_region(page)
            if region:
                candidate_pages.append((i, qid, region[0], region[1]))

    if not candidate_pages:
        print("    no figure pages")
        return 0

    print(f"    {len(candidate_pages)} pages with figures — rendering at {DPI} DPI...", flush=True)

    page_indices = [i for i, *_ in candidate_pages]
    pil_pages = convert_from_path(
        str(pdf_path),
        dpi=DPI,
        first_page=min(page_indices) + 1,
        last_page=max(page_indices) + 1,
    )
    offset = min(page_indices)
    pil_map = {offset + j: img for j, img in enumerate(pil_pages)}

    count = 0
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_idx, qid, fig_top, fig_bot in candidate_pages:
            if qid in images:
                print(f"    [{qid[:8]}] already captured — skip")
                continue

            pil = pil_map.get(page_idx)
            if pil is None:
                continue

            page = pdf.pages[page_idx]
            crop = crop_figure(page, pil, fig_top, fig_bot)
            images[qid] = pil_to_base64(crop)
            count += 1
            print(f"    [{qid[:8]}] {crop.size[0]}×{crop.size[1]}px")

    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", help="Process a single PDF instead of the whole directory")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    images: dict = {}

    pdfs = [Path(args.pdf)] if args.pdf else sorted(PDF_DIR.glob("*.pdf"))
    print(f"Processing {len(pdfs)} PDF(s)...")

    for pdf_path in pdfs:
        process_pdf(pdf_path, images)

    OUTPUT_FILE.write_text(
        json.dumps(images, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\n{'─'*50}")
    print(f"Figures captured : {len(images)}")
    print(f"Saved to         : {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
