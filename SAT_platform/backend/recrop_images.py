#!/usr/bin/env python3
"""Re-crop figure images in an existing math JSON using updated bbox padding.
Does NOT call Claude — purely uses pdfplumber + pdf2image locally.

Usage:
  python recrop_images.py <path/to/Area and volume.pdf> <path/to/Area and volume.json>
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

from pdf2image import convert_from_path
import pdfplumber

from pdf_to_json_claude import _figure_bbox_fractions, _crop, _pil_to_base64


def main() -> None:
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    pdf_path = Path(sys.argv[1])
    json_path = Path(sys.argv[2])

    questions = json.loads(json_path.read_text(encoding="utf-8"))
    by_qid = {q["question_id"]: q for q in questions}

    pages = convert_from_path(str(pdf_path), dpi=150)
    with pdfplumber.open(str(pdf_path)) as pdf_plumb:
        plumb_pages = pdf_plumb.pages
        updated = 0
        for i, page_img in enumerate(pages):
            bbox = _figure_bbox_fractions(plumb_pages[i])
            if bbox is None:
                continue
            text = plumb_pages[i].extract_text() or ""
            m = re.search(r"Question ID:\s*([0-9a-fA-F]+)", text)
            if not m:
                continue
            qid = m.group(1).lower()
            q = by_qid.get(qid)
            if not q:
                continue
            cropped = _crop(
                page_img,
                top    = bbox["top"],
                left   = bbox["left"],
                bottom = bbox["bottom"],
                right  = bbox["right"],
            )
            q["image"] = _pil_to_base64(cropped)
            updated += 1
            print(f"  recropped p{i+1} qid={qid[:8]}")

    json_path.write_text(json.dumps(questions, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nUpdated {updated} images in {json_path.name}")


if __name__ == "__main__":
    main()
