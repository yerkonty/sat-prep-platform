"""Robust parser for College Board SAT Question Bank answer PDFs."""

from __future__ import annotations

import json
import re
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pdfplumber


LETTER_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}


SKILL_TO_DOMAIN = {
    # Reading & Writing
    "Central Ideas and Details": "Information and Ideas",
    "Command of Evidence (Textual)": "Information and Ideas",
    "Command of Evidence (Quantitative)": "Information and Ideas",
    "Inferences": "Information and Ideas",
    "Words in Context": "Craft and Structure",
    "Text Structure and Purpose": "Craft and Structure",
    "Cross-Text Connections": "Craft and Structure",
    "Transitions": "Expression of Ideas",
    "Rhetorical Synthesis": "Expression of Ideas",
    "Boundaries": "Standard English Conventions",
    "Form, Structure, and Sense": "Standard English Conventions",
    # Math — Algebra
    "Linear equations (one variable, two variables)": "Algebra",
    "Linear functions": "Algebra",
    "Linear inequalities in one or two variables": "Algebra",
    "Systems of equations": "Algebra",
    # Math — Advanced Math
    "Equivalent expressions": "Advanced Math",
    "Nonlinear equations": "Advanced Math",
    "Nonlinear functions": "Advanced Math",
    # Math — Problem-Solving and Data Analysis
    "Ratios, rates, proportional relationships, and units": "Problem-Solving and Data Analysis",
    "Percentages": "Problem-Solving and Data Analysis",
    "One-variable data: Distributions and measures of center and spread": "Problem-Solving and Data Analysis",
    "Two-variable data: Models and scatterplots": "Problem-Solving and Data Analysis",
    "Probability and conditional probability": "Problem-Solving and Data Analysis",
    "Inference from sample statistics and margin of error": "Problem-Solving and Data Analysis",
    "Evaluating statistical claims: Observational studies and experiments": "Problem-Solving and Data Analysis",
    # Legacy aliases kept for backward compatibility
    "Ratios, rates, percentages": "Problem-Solving and Data Analysis",
    "Data distributions": "Problem-Solving and Data Analysis",
    # Math — Geometry and Trigonometry
    "Lines, angles, and triangles": "Geometry and Trigonometry",
    "Right triangles and trigonometry": "Geometry and Trigonometry",
    "Circles": "Geometry and Trigonometry",
    "Area and volume": "Geometry and Trigonometry",
    # Legacy alias
    "Lines, angles, triangles": "Geometry and Trigonometry",
}


SKILL_ALIASES = {
    # Reading & Writing
    "central ideas and details": "Central Ideas and Details",
    "command of evidence (textual)": "Command of Evidence (Textual)",
    "command of evidence textual": "Command of Evidence (Textual)",
    "command of evidence (quantitative)": "Command of Evidence (Quantitative)",
    "command of evidence quantitative": "Command of Evidence (Quantitative)",
    "inferences": "Inferences",
    "words in context": "Words in Context",
    "text structure and purpose": "Text Structure and Purpose",
    "cross-text connections": "Cross-Text Connections",
    "cross text connections": "Cross-Text Connections",
    "transitions": "Transitions",
    "rhetorical synthesis": "Rhetorical Synthesis",
    "boundaries": "Boundaries",
    "form, structure, and sense": "Form, Structure, and Sense",
    "form, structure and sense": "Form, Structure, and Sense",
    "form structure and sense": "Form, Structure, and Sense",
    "form, structure, conventions and sense": "Form, Structure, and Sense",
    # Math — Algebra (longer aliases first to prevent partial matches)
    "linear inequalities in one or two variables": "Linear inequalities in one or two variables",
    "linear inequalities": "Linear inequalities in one or two variables",
    "systems of two linear equations in two variables": "Systems of equations",
    "systems of equations": "Systems of equations",
    "linear equations in one variable": "Linear equations (one variable, two variables)",
    "linear equations in two variables": "Linear equations (one variable, two variables)",
    "linear equations": "Linear equations (one variable, two variables)",
    "linear functions": "Linear functions",
    # Math — Advanced Math (nonlinear must come before linear to avoid substring match)
    "nonlinear equations in one variable and systems of equations in two variables": "Nonlinear equations",
    "nonlinear equations": "Nonlinear equations",
    "nonlinear functions": "Nonlinear functions",
    "equivalent expressions": "Equivalent expressions",
    # Math — Problem-Solving and Data Analysis
    "evaluating statistical claims: observational studies and experiments": "Evaluating statistical claims: Observational studies and experiments",
    "evaluating statistical claims": "Evaluating statistical claims: Observational studies and experiments",
    "one-variable data: distributions and measures of center and spread": "One-variable data: Distributions and measures of center and spread",
    "one-variable data": "One-variable data: Distributions and measures of center and spread",
    "two-variable data: models and scatterplots": "Two-variable data: Models and scatterplots",
    "two-variable data": "Two-variable data: Models and scatterplots",
    "inference from sample statistics and margin of error": "Inference from sample statistics and margin of error",
    "ratios, rates, proportional relationships, and units": "Ratios, rates, proportional relationships, and units",
    "ratios, rates, proportional relationships": "Ratios, rates, proportional relationships, and units",
    "probability and conditional probability": "Probability and conditional probability",
    "probability": "Probability and conditional probability",
    "percentages": "Percentages",
    # Legacy R&W aliases
    "ratios, rates, percentages": "Ratios, rates, percentages",
    "data distributions": "Data distributions",
    # Math — Geometry and Trigonometry
    "right triangles and trigonometry": "Right triangles and trigonometry",
    "lines, angles, and triangles": "Lines, angles, and triangles",
    "lines, angles, triangles": "Lines, angles, and triangles",
    "circles": "Circles",
    "area and volume": "Area and volume",
}


FILENAME_SKILL_HINTS = {
    # Reading & Writing
    "wordsincontext": "Words in Context",
    "textstructureandpurpose": "Text Structure and Purpose",
    "craftandstructure": "Text Structure and Purpose",
    "transition": "Transitions",
    "notes": "Rhetorical Synthesis",
    "boundary": "Boundaries",
    "boundaries": "Boundaries",
    "centralideas": "Central Ideas and Details",
    "commandofevidence": "Command of Evidence (Textual)",
    "crosstextconnection": "Cross-Text Connections",
    "rhetoricalsynthesis": "Rhetorical Synthesis",
    "textandstructure": "Text Structure and Purpose",
    "formstructuresense": "Form, Structure, and Sense",
    # Math — Algebra (longer keys first)
    "linearinequalities": "Linear inequalities in one or two variables",
    "linearinequality": "Linear inequalities in one or two variables",
    "systemoftwolin": "Systems of equations",
    "systemoftwolinear": "Systems of equations",
    "linearfunction": "Linear functions",
    "linearequation": "Linear equations (one variable, two variables)",
    # Math — Advanced Math (nonlinear before linear to avoid substring match)
    "nonlinearfunction": "Nonlinear functions",
    "nonlinearequation": "Nonlinear equations",
    "equivalentexpression": "Equivalent expressions",
    # Math — Problem-Solving and Data Analysis
    "evaluatingstatistical": "Evaluating statistical claims: Observational studies and experiments",
    "inferencefromsample": "Inference from sample statistics and margin of error",
    "onevariabledata": "One-variable data: Distributions and measures of center and spread",
    "twovariabledata": "Two-variable data: Models and scatterplots",
    "probability": "Probability and conditional probability",
    "percentages": "Percentages",
    "ratiosrates": "Ratios, rates, proportional relationships, and units",
    # Math — Geometry and Trigonometry
    "righttriangl": "Right triangles and trigonometry",
    "linesangles": "Lines, angles, and triangles",
    "areaandvolume": "Area and volume",
    "circle": "Circles",
}


SECTION_KEYWORDS = {
    "reading_writing": ["reading and writing", "sat reading and writing"],
    "math": ["sat math", "algebra", "trigonometry", "geometry"],
}


def _clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\s*\n\s*", "\n", value)
    return value.strip()


def _join_lines(lines: List[str]) -> str:
    paragraphs: List[str] = []
    buf: List[str] = []
    for line in lines:
        normalized = _clean_text(line)
        if not normalized:
            if buf:
                paragraphs.append(" ".join(buf).strip())
                buf = []
            continue
        buf.append(normalized)
    if buf:
        paragraphs.append(" ".join(buf).strip())
    return "\n\n".join(part for part in paragraphs if part).strip()


def _extract_question_id(text: str) -> str:
    match = re.search(r"Question\s+ID\s*:?\s*([a-z0-9]+)", text, re.IGNORECASE)
    if match:
        return match.group(1).lower()
    return str(uuid.uuid4())


def _extract_header_blob(text: str, question_id: str) -> str:
    pattern = r"Assessment Test Domain Skill Difficulty\s*(.+?)\s*" + re.escape(
        f"ID: {question_id}"
    )
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return _clean_text(match.group(1)).replace("\n", " ")


def _infer_section(header_blob: str, file_path: Path) -> str:
    text = f"{header_blob} {file_path.as_posix()}".lower()
    for section, keywords in SECTION_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return section
    parent_name = file_path.parent.name.lower()
    if "verbal" in parent_name:
        return "reading_writing"
    if "math" in parent_name:
        return "math"
    return "reading_writing"


def _infer_skill(header_blob: str, content: str, file_path: Path) -> Optional[str]:
    header_lc = header_blob.lower()

    # 1) Strong match from header text
    for alias, canonical in sorted(
        SKILL_ALIASES.items(), key=lambda item: -len(item[0])
    ):
        if alias in header_lc:
            return canonical

    # 2) Filename hint fallback
    stem = file_path.stem.replace("_", "").replace("-", "").lower()
    for key, canonical in FILENAME_SKILL_HINTS.items():
        if key in stem:
            return canonical

    # 3) Prompt-based heuristic fallback
    content_lc = content.lower()
    if "text 1" in content_lc and "text 2" in content_lc:
        return "Cross-Text Connections"
    if "most logical transition" in content_lc:
        return "Transitions"
    if "notes:" in content_lc and "student has taken" in content_lc:
        return "Rhetorical Synthesis"
    if "most logical and precise word or phrase" in content_lc:
        return "Words in Context"
    if (
        "main purpose of the text" in content_lc
        or "function of the underlined" in content_lc
    ):
        return "Text Structure and Purpose"
    if "conventions of standard english" in content_lc:
        # Without a stronger signal, this is usually one of these two skills.
        if any(
            token in content_lc
            for token in ["comma", "semicolon", "colon", "dash", "punctuation"]
        ):
            return "Boundaries"
        return "Form, Structure, and Sense"
    return None


def _passage_type(content: str) -> str:
    content_lc = content.lower()
    if re.search(r"\btext\s*1\b", content_lc) and re.search(
        r"\btext\s*2\b", content_lc
    ):
        return "dual"
    return "single"


def _extract_question_block(text: str, question_id: str) -> Optional[str]:
    pattern = (
        re.escape(f"ID: {question_id}")
        + r"\s*(.+?)\s*"
        + re.escape(f"ID: {question_id} Answer")
    )
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    return match.group(1).strip()


def _parse_content_and_options(question_block: str) -> Tuple[str, List[str]]:
    lines = [line.rstrip() for line in question_block.splitlines()]

    # Detect option marker candidates at hard line-start only. This avoids false
    # matches from abbreviations like "C. furcatus" that appear in wrapped lines.
    marker_pattern = re.compile(r"^([A-D])\.\s+(.*)$")
    candidates: Dict[str, List[int]] = {"A": [], "B": [], "C": [], "D": []}
    for idx, raw in enumerate(lines):
        match = marker_pattern.match(raw)
        if match:
            candidates[match.group(1)].append(idx)

    if not all(candidates[letter] for letter in ["A", "B", "C", "D"]):
        # Keep entire text in content and return empty options if structure is not A-D MCQ.
        return _join_lines([_clean_text(line) for line in lines]), ["", "", "", ""]

    d_idx = candidates["D"][-1]
    c_idx_candidates = [idx for idx in candidates["C"] if idx < d_idx]
    if not c_idx_candidates:
        return _join_lines([_clean_text(line) for line in lines]), ["", "", "", ""]
    c_idx = c_idx_candidates[-1]

    b_idx_candidates = [idx for idx in candidates["B"] if idx < c_idx]
    if not b_idx_candidates:
        return _join_lines([_clean_text(line) for line in lines]), ["", "", "", ""]
    b_idx = b_idx_candidates[-1]

    a_idx_candidates = [idx for idx in candidates["A"] if idx < b_idx]
    if not a_idx_candidates:
        return _join_lines([_clean_text(line) for line in lines]), ["", "", "", ""]
    a_idx = a_idx_candidates[-1]

    def marker_text(line: str) -> str:
        marker = marker_pattern.match(line)
        if not marker:
            return ""
        return _clean_text(marker.group(2))

    def body(start_idx: int, end_idx: int) -> str:
        body_lines = [
            _clean_text(line)
            for line in lines[start_idx + 1 : end_idx]
            if _clean_text(line)
        ]
        return " ".join(body_lines).strip()

    content = _join_lines([_clean_text(line) for line in lines[:a_idx]])
    options = [
        " ".join(
            part for part in [marker_text(lines[a_idx]), body(a_idx, b_idx)] if part
        ).strip(),
        " ".join(
            part for part in [marker_text(lines[b_idx]), body(b_idx, c_idx)] if part
        ).strip(),
        " ".join(
            part for part in [marker_text(lines[c_idx]), body(c_idx, d_idx)] if part
        ).strip(),
        " ".join(
            part
            for part in [marker_text(lines[d_idx]), body(d_idx, len(lines))]
            if part
        ).strip(),
    ]
    return content, options


def _parse_per_page_question(text: str, file_path: Path) -> Optional[Dict]:
    """Parse a CB question-bank PDF page with one question per page.

    Expected layout (each section delimited by a standalone header line):
      Question ID: {hex}
      Assessment Test  Domain  Skill  Difficulty
      SAT Reading and Writing  {domain}  {skill}  {difficulty}
      Question
      {question content}
      Answer
      A. ...  B. ...  C. ...  D. ...
      Correct Answer: {letter}
      Rationale
      {explanation}
    """
    id_match = re.search(r"Question\s+ID\s*:?\s*([a-z0-9]+)", text, re.IGNORECASE)
    if not id_match:
        return None
    question_id = id_match.group(1).lower()

    # Extract the content block between the "Question" and "Answer" section headers.
    content_match = re.search(
        r"\bQuestion\b[ \t]*\n(.*?)\n[ \t]*\bAnswer\b[ \t]*\n",
        text, re.IGNORECASE | re.DOTALL
    )
    if not content_match:
        return None
    raw_content = content_match.group(1).strip()

    # Extract the options block between "Answer" and "Correct Answer:".
    opts_match = re.search(
        r"\bAnswer\b[ \t]*\n(.*?)(?=\n[ \t]*Correct Answer\b)",
        text, re.IGNORECASE | re.DOTALL
    )
    if not opts_match:
        return None
    opts_block = opts_match.group(1)

    _, options = _parse_content_and_options(opts_block)
    if any(not opt for opt in options):
        return None

    correct_answer = _extract_correct_answer_index(text)
    if correct_answer is None:
        return None

    # Difficulty: last word of the metadata row (Easy / Medium / Hard).
    diff_match = re.search(
        r"SAT\s+(?:Reading|Math).+?\b(Easy|Medium|Hard)\b", text, re.IGNORECASE | re.DOTALL
    )
    difficulty = diff_match.group(1).lower() if diff_match else "medium"

    # Explanation: everything after "Rationale\n".
    rationale_match = re.search(r"\bRationale\b[ \t]*\n(.+)$", text, re.IGNORECASE | re.DOTALL)
    explanation = _clean_text(rationale_match.group(1)) if rationale_match else ""

    # Header blob: text before the "Question\n" section header (contains skill/domain).
    # The PDF column layout interleaves the domain name and difficulty word with the skill
    # text across multiple lines. Strip them so aliases can match the skill name cleanly.
    pre_question = text[:content_match.start()].strip()
    header_blob = _clean_text(pre_question).replace("\n", " ")
    header_blob = re.sub(r"\b(easy|medium|hard)\b", " ", header_blob, flags=re.IGNORECASE)
    # Strip known domain-name fragments that get interspersed with the skill text
    header_blob = re.sub(r"\bproblem-solving\s+and\b", " ", header_blob, flags=re.IGNORECASE)
    header_blob = re.sub(r"\bdata\s+analysis\b", " ", header_blob, flags=re.IGNORECASE)
    header_blob = re.sub(r"\bgeometry\s+and\b", " ", header_blob, flags=re.IGNORECASE)
    header_blob = re.sub(r"\s{2,}", " ", header_blob).strip()

    section = _infer_section(header_blob, file_path)
    skill = _infer_skill(header_blob, raw_content, file_path)
    if not skill:
        return None
    domain = SKILL_TO_DOMAIN.get(skill, "")
    if not domain:
        return None

    content = _join_lines([_clean_text(line) for line in raw_content.splitlines()])
    return {
        "question_id": question_id,
        "passage_type": _passage_type(content),
        "section": section,
        "domain": domain,
        "skill": skill,
        "difficulty": difficulty,
        "content": content,
        "options": options,
        "correct_answer": correct_answer,
        "explanation": explanation,
    }


def _extract_correct_answer_index(text: str) -> Optional[int]:
    match = re.search(r"Correct Answer:\s*([A-D]|\d[\d,\.]*)", text, re.IGNORECASE)
    if not match:
        return None
    token = match.group(1).strip().upper()
    if token in LETTER_TO_INDEX:
        return LETTER_TO_INDEX[token]
    return None


def _extract_explanation(text: str) -> str:
    match = re.search(
        r"Rationale\s*(.+?)\s*Question Difficulty:", text, re.IGNORECASE | re.DOTALL
    )
    if not match:
        match = re.search(r"Rationale\s*(.+)$", text, re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return _clean_text(match.group(1))


def _extract_difficulty(text: str) -> str:
    match = re.search(r"Question Difficulty:\s*(Easy|Medium|Hard)", text, re.IGNORECASE)
    if not match:
        return "medium"
    return match.group(1).strip().lower()


def parse_page(text: str, file_path: Path) -> Optional[Dict]:
    """Parse one PDF page into normalized question JSON schema."""
    if "Question ID" not in text:
        return None

    question_id = _extract_question_id(text)
    question_block = _extract_question_block(text, question_id)
    if not question_block:
        # Try the per-page format (one question per page with "Question" / "Answer" headers).
        return _parse_per_page_question(text, file_path)

    content, options = _parse_content_and_options(question_block)
    if not content:
        return None

    # Keep only A-D multiple-choice questions for the website flow.
    if any(not option for option in options):
        return None

    correct_answer = _extract_correct_answer_index(text)
    if correct_answer is None:
        return None

    header_blob = _extract_header_blob(text, question_id)
    section = _infer_section(header_blob, file_path)
    skill = _infer_skill(header_blob, content, file_path)
    if not skill:
        return None
    domain = SKILL_TO_DOMAIN.get(skill, "")
    if not domain:
        return None

    return {
        "question_id": question_id,
        "passage_type": _passage_type(content),
        "section": section,
        "domain": domain,
        "skill": skill,
        "difficulty": _extract_difficulty(text),
        "content": content,
        "options": options,
        "correct_answer": correct_answer,
        "explanation": _extract_explanation(text),
    }


def extract_questions_from_pdf(pdf_path: str) -> List[Dict]:
    """Extract all valid multiple-choice questions from an answer PDF."""
    questions: List[Dict] = []
    path_obj = Path(pdf_path)

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            question = parse_page(text, file_path=path_obj)
            if question:
                questions.append(question)
    return questions


def export_to_json(questions: List[Dict], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(questions, file, indent=2, ensure_ascii=False)
    print(f"Exported {len(questions)} questions to {output_path}")


if __name__ == "__main__":
    sample_pdf = (
        r"C:\Users\Asus\OneDrive\Desktop\SAT\Verbal\InferencesQBwithanswers.pdf"
    )
    output_json = r"C:\Users\Asus\OneDrive\Desktop\SAT\Verbal\inferences_output.json"

    print(f"Parsing: {sample_pdf}")
    extracted = extract_questions_from_pdf(sample_pdf)
    print(f"Found {len(extracted)} valid questions")
    if extracted:
        sample = extracted[0]
        print("\n=== Sample Question ===")
        print(f"ID: {sample['question_id']}")
        print(f"Passage Type: {sample['passage_type']}")
        print(f"Domain: {sample['domain']}")
        print(f"Skill: {sample['skill']}")
        print(f"Difficulty: {sample['difficulty']}")
        print(f"Content: {sample['content'][:180]}...")
        print(f"Correct Answer Index: {sample['correct_answer']}")

    if extracted:
        export_to_json(extracted, output_json)
