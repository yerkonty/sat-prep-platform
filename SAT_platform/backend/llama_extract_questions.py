#!/usr/bin/env python3
"""
Extract SAT math questions from PDFs using LlamaCloud Extract.

Setup:
  pip install llama-cloud
  export LLAMA_CLOUD_API_KEY="llx-..."   # free at cloud.llamaindex.ai

Usage:
  python llama_extract_questions.py              # all 19 PDFs
  python llama_extract_questions.py --resume     # skip already-done PDFs
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from pathlib import Path

try:
    from llama_cloud import LlamaCloud
    from llama_cloud.types import ExtractConfigurationParam
except ImportError:
    print("pip install llama-cloud")
    sys.exit(1)

# ── Paths ──────────────────────────────────────────────────────────────────────
PDF_DIR    = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math")
OUTPUT_DIR = Path("/home/yerkonty/Downloads/SatQuestionBank_platform/Math_JSON")

# ── JSON Schema for extraction ─────────────────────────────────────────────────
QUESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "description": "All multiple-choice (A-D) SAT math questions in this PDF",
            "items": {
                "type": "object",
                "properties": {
                    "question_id": {
                        "type": "string",
                        "description": "Hex ID from the 'Question ID:' line, lowercase"
                    },
                    "skill": {
                        "type": "string",
                        "description": "Skill value from the header table, e.g. 'Nonlinear functions'"
                    },
                    "domain": {
                        "type": "string",
                        "description": "Domain value from the header table, e.g. 'Advanced Math'"
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                        "description": "Difficulty from the header table"
                    },
                    "content": {
                        "type": "string",
                        "description": "Question stem only — no answer choices. Use LaTeX for ALL math expressions: inline $x^2$ or display $$y=mx+b$$"
                    },
                    "options": {
                        "type": "array",
                        "items": {"type": "string"},
                        "minItems": 4,
                        "maxItems": 4,
                        "description": "Exactly 4 answer choices [A, B, C, D] with LaTeX for all math"
                    },
                    "correct_answer": {
                        "type": "integer",
                        "enum": [0, 1, 2, 3],
                        "description": "Index of correct answer: 0=A, 1=B, 2=C, 3=D"
                    },
                    "explanation": {
                        "type": "string",
                        "description": "Full Rationale text. Use LaTeX for all math."
                    }
                },
                "required": ["question_id", "skill", "domain", "difficulty",
                             "content", "options", "correct_answer", "explanation"]
            }
        }
    },
    "required": ["questions"]
}

SYSTEM_PROMPT = (
    "You are extracting SAT math questions from College Board PDF pages. "
    "Use LaTeX notation for ALL math expressions: inline $x^2$ or display $$y=mx+b$$. "
    "Skip any Student-Produced Response questions (those without A-D choices). "
    "Extract every multiple-choice question — do not miss any."
)


def pdf_to_base64(pdf_path: Path) -> str:
    return base64.b64encode(pdf_path.read_bytes()).decode()


def extract_pdf(client: LlamaCloud, pdf_path: Path) -> list[dict]:
    print(f"  Uploading & extracting...", end=" ", flush=True)

    file_b64 = pdf_to_base64(pdf_path)
    file_input = f"data:application/pdf;base64,{file_b64}"

    job = client.extract.run(
        file_input=file_input,
        configuration=ExtractConfigurationParam(
            data_schema=QUESTION_SCHEMA,
            system_prompt=SYSTEM_PROMPT,
        ),
        verbose=True,
    )

    # job.data is a dict matching QUESTION_SCHEMA
    raw = job.data if hasattr(job, "data") else {}
    if isinstance(raw, str):
        raw = json.loads(raw)

    questions_raw = raw.get("questions", []) if isinstance(raw, dict) else []

    questions = []
    for q in questions_raw:
        if not q.get("question_id") or not q.get("content"):
            continue
        if not isinstance(q.get("options"), list) or len(q["options"]) != 4:
            continue
        if q.get("correct_answer") not in (0, 1, 2, 3):
            continue
        q["section"] = "math"
        q["image"] = None
        questions.append(q)

    return questions


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", action="store_true", help="Skip already-processed PDFs")
    args = parser.parse_args()

    api_key = os.getenv("LLAMA_CLOUD_API_KEY")
    if not api_key:
        print("Set your API key:")
        print('  export LLAMA_CLOUD_API_KEY="llx-..."')
        print("Get a free key at: cloud.llamaindex.ai")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # Try EU region first (most common for non-US accounts), fall back to US
    base_url = os.getenv("LLAMA_CLOUD_BASE_URL", "https://api.eu.cloud.llamaindex.ai")
    client = LlamaCloud(api_key=api_key, base_url=base_url)

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"PDFs found : {len(pdfs)}")
    print(f"Output dir : {OUTPUT_DIR}\n")

    all_questions: list[dict] = []

    for pdf_path in pdfs:
        out_file = OUTPUT_DIR / (pdf_path.stem + ".json")

        if args.resume and out_file.exists():
            existing = json.loads(out_file.read_text(encoding="utf-8"))
            print(f"SKIP  {pdf_path.name}  ({len(existing)} questions)")
            all_questions.extend(existing)
            continue

        print(f"\n{pdf_path.name}")
        try:
            questions = extract_pdf(client, pdf_path)
            out_file.write_text(
                json.dumps(questions, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            all_questions.extend(questions)
            print(f"done — {len(questions)} questions → {out_file.name}")
        except Exception as e:
            print(f"ERROR: {e}")
            continue

    combined = OUTPUT_DIR / "all_math_questions.json"
    combined.write_text(
        json.dumps(all_questions, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\n{'─'*50}")
    print(f"Total questions : {len(all_questions)}")
    print(f"Combined JSON   : {combined}")
    print(f"\nNext step:")
    print(f"  python import_json_questions.py {combined}")


if __name__ == "__main__":
    main()
