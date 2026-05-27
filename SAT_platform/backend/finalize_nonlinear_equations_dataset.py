#!/usr/bin/env python3
from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from pdf2image import convert_from_path
from PIL import Image

PDF_PATH = Path(
    "/home/yerkonty/Downloads/SatQuestionBank_platform/Math/"
    "Nonlinear equations in one variable and systems of equations in two variables.pdf"
)
GENERATED_DIR = Path("generated_math_json")
MCQ_PATH = GENERATED_DIR / "nonlinear_equations_mcq.json"
SPR_PATH = GENERATED_DIR / "nonlinear_equations_spr.json"
SPR_EXTRA_PATH = GENERATED_DIR / "nonlinear_equations_spr_extra.json"
SPR_RETRY_PATH = GENERATED_DIR / "nonlinear_equations_spr_retry.json"

NORMALIZED_SKILL = "Nonlinear equations"
NORMALIZED_DOMAIN = "Advanced Math"
FALSE_QUESTION_IMAGE_IDS = {"6ce95fc8", "7f81d0c3", "928498f3"}


def _encode_crop(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _option_html(image_b64: str, label: str) -> str:
    return (
        f'<img src="data:image/png;base64,{image_b64}" '
        f'alt="Answer choice {label}" '
        'style="max-width:100%;height:auto;display:block;border-radius:8px;" />'
    )


def _manual_multpage_question() -> dict:
    page55 = convert_from_path(str(PDF_PATH), dpi=180, first_page=55, last_page=55)[0]
    page56 = convert_from_path(str(PDF_PATH), dpi=180, first_page=56, last_page=56)[0]
    page57 = convert_from_path(str(PDF_PATH), dpi=180, first_page=57, last_page=57)[0]

    crops = {
        "A": page55.crop((390, 600, 1080, 1500)),
        "B": page56.crop((390, 60, 1080, 730)),
        "C": page56.crop((390, 1000, 1080, 1860)),
        "D": page57.crop((390, 60, 1080, 860)),
    }

    return {
        "question_id": "75a32330",
        "skill": NORMALIZED_SKILL,
        "domain": NORMALIZED_DOMAIN,
        "difficulty": "medium",
        "section": "math",
        "content": (
            "Which graph represents the given system of equations?\n\n"
            "$$y = x^2 + 1.7$$\n\n"
            "$$y = 1.7 - x$$"
        ),
        "options": [
            _option_html(_encode_crop(crops["A"]), "A"),
            _option_html(_encode_crop(crops["B"]), "B"),
            _option_html(_encode_crop(crops["C"]), "C"),
            _option_html(_encode_crop(crops["D"]), "D"),
        ],
        "correct_answer": 0,
        "explanation": (
            "Choice A is correct. The graph of a quadratic equation in the form "
            "$y = x^2 + c$ has its vertex at $(0, c)$. The first equation in the "
            "given system of equations is $y = x^2 + 1.7$, so the graph of this "
            "quadratic equation has its vertex at $(0, 1.7)$. The graph of a "
            "linear equation of the form $y = b - x$ has a slope of $-1$ and a "
            "y-intercept at $(0, b)$. The second equation in the given system of "
            "equations is $y = 1.7 - x$, so the graph of this linear equation has "
            "a slope of $-1$ and a y-intercept at $(0, 1.7)$. Of the choices, only "
            "choice A has the graph of a quadratic equation with its vertex at "
            "$(0, 1.7)$ and the graph of a linear equation with a slope of $-1$ "
            "and a y-intercept at $(0, 1.7)$.\n\n"
            "Choice B is incorrect. This graph represents a system in which the "
            "second equation is $y = 1.7 + x$, not $y = 1.7 - x$.\n\n"
            "Choice C is incorrect. This graph represents a system in which the "
            "first equation is $y = (x + 1.7)^2$, not $y = x^2 + 1.7$.\n\n"
            "Choice D is incorrect. This graph represents a system in which the "
            "first equation is $y = (x + 1.7)^2$, not $y = x^2 + 1.7$, and the "
            "second equation is $y = 1.7 + x$, not $y = 1.7 - x$."
        ),
        "image": None,
    }


def _normalize_questions(items: list[dict]) -> list[dict]:
    normalized = []
    for item in items:
        entry = dict(item)
        entry["skill"] = NORMALIZED_SKILL
        entry["domain"] = entry.get("domain") or NORMALIZED_DOMAIN
        if str(entry.get("question_id", "")).lower().strip() in FALSE_QUESTION_IMAGE_IDS:
            entry["image"] = None
        normalized.append(entry)
    return normalized


def main() -> None:
    mcq = _normalize_questions(json.loads(MCQ_PATH.read_text(encoding="utf-8")))
    spr = _normalize_questions(json.loads(SPR_PATH.read_text(encoding="utf-8")))
    spr.extend(_normalize_questions(json.loads(SPR_EXTRA_PATH.read_text(encoding="utf-8"))))
    spr.extend(_normalize_questions(json.loads(SPR_RETRY_PATH.read_text(encoding="utf-8"))))

    if not any(q["question_id"] == "75a32330" for q in mcq):
        manual_question = _manual_multpage_question()
        insert_at = next((i + 1 for i, q in enumerate(mcq) if q["question_id"] == "802549ac"), len(mcq))
        mcq.insert(insert_at, manual_question)

    # De-duplicate while preserving order.
    def dedupe(items: list[dict]) -> list[dict]:
        seen: set[str] = set()
        output: list[dict] = []
        for item in items:
            qid = str(item.get("question_id", "")).lower().strip()
            if not qid or qid in seen:
                continue
            seen.add(qid)
            output.append(item)
        return output

    mcq = dedupe(mcq)
    spr = dedupe(spr)

    MCQ_PATH.write_text(json.dumps(mcq, indent=2, ensure_ascii=False), encoding="utf-8")
    SPR_PATH.write_text(json.dumps(spr, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"MCQ total: {len(mcq)}")
    print(f"SPR total: {len(spr)}")
    print(f"Wrote: {MCQ_PATH}")
    print(f"Wrote: {SPR_PATH}")


if __name__ == "__main__":
    main()
