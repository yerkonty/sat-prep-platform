#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

GENERATED_DIR = Path("generated_math_json")
MCQ_PATH = GENERATED_DIR / "equivalent_expressions_mcq.json"
SPR_PATH = GENERATED_DIR / "equivalent_expressions_spr.json"

NORMALIZED_SKILL = "Equivalent expressions"
NORMALIZED_DOMAIN = "Advanced Math"

# These pages contain display-math only; the formulas should stay in content,
# not render as question images above the passage.
FALSE_QUESTION_IMAGE_IDS = {"463eec13", "0b3d25c5", "7355b9d9", "40c09d66"}


def _normalize_text(value: str) -> str:
    return value.replace("\\n", "\n").strip()


def _normalize_questions(items: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for item in items:
        entry = dict(item)
        entry["skill"] = NORMALIZED_SKILL
        entry["domain"] = entry.get("domain") or NORMALIZED_DOMAIN

        if isinstance(entry.get("content"), str):
            entry["content"] = _normalize_text(entry["content"])
        if isinstance(entry.get("explanation"), str):
            entry["explanation"] = _normalize_text(entry["explanation"])

        qid = str(entry.get("question_id", "")).lower().strip()
        if qid in FALSE_QUESTION_IMAGE_IDS:
            entry["image"] = None

        normalized.append(entry)
    return normalized


def _dedupe(items: list[dict]) -> list[dict]:
    seen: set[str] = set()
    output: list[dict] = []
    for item in items:
        qid = str(item.get("question_id", "")).lower().strip()
        if not qid or qid in seen:
            continue
        seen.add(qid)
        output.append(item)
    return output


def main() -> None:
    mcq = _dedupe(_normalize_questions(json.loads(MCQ_PATH.read_text(encoding="utf-8"))))
    spr = _dedupe(_normalize_questions(json.loads(SPR_PATH.read_text(encoding="utf-8"))))

    MCQ_PATH.write_text(json.dumps(mcq, indent=2, ensure_ascii=False), encoding="utf-8")
    SPR_PATH.write_text(json.dumps(spr, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"MCQ total: {len(mcq)}")
    print(f"SPR total: {len(spr)}")
    print(f"Wrote: {MCQ_PATH}")
    print(f"Wrote: {SPR_PATH}")


if __name__ == "__main__":
    main()
