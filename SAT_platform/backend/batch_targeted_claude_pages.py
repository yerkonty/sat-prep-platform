#!/usr/bin/env python3
"""
Run targeted_claude_math_parse.py one page at a time and merge the results.

This avoids long-lived Anthropic connection issues where the first page works
but later pages in the same process fail with connection errors.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from targeted_claude_math_parse import _parse_pages


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch targeted Claude parser with one-page subprocesses")
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--pages", required=True)
    parser.add_argument("--mode", choices=["mcq", "spr"], required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    page_numbers = _parse_pages(args.pages)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    merged: list[dict] = []
    seen_ids: set[str] = set()

    with tempfile.TemporaryDirectory(prefix="claude_page_runs_") as tmpdir:
        tmpdir_path = Path(tmpdir)
        for page_number in page_numbers:
            temp_output = tmpdir_path / f"page_{page_number}.json"
            cmd = [
                sys.executable,
                "targeted_claude_math_parse.py",
                "--pdf",
                str(pdf_path),
                "--pages",
                str(page_number),
                "--mode",
                args.mode,
                "--output",
                str(temp_output),
            ]
            print(f"[batch] page {page_number}")
            subprocess.run(cmd, check=True)

            if not temp_output.exists():
                continue
            data = json.loads(temp_output.read_text(encoding="utf-8"))
            for item in data:
                question_id = str(item.get("question_id", "")).lower().strip()
                if not question_id or question_id in seen_ids:
                    continue
                seen_ids.add(question_id)
                merged.append(item)

    output_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"saved {len(merged)} -> {output_path}")


if __name__ == "__main__":
    main()
