#!/usr/bin/env python3
"""
Repair the imported "Inference from sample statistics and margin of error" dataset.

This fixes the known low-quality OCR/manual merge issues by:
1. Restoring exact question/explanation text for the flagged questions.
2. Cropping the real table figures from the source PDF and embedding them.
3. Writing the repaired JSON back to the repo-local generated files.

Run from the backend directory.
"""
from __future__ import annotations

import base64
import io
import json
import re
from pathlib import Path

import pdfplumber
from pdf2image import convert_from_path
from PIL import Image

PDF_PATH = Path(
    "/home/yerkonty/Downloads/SatQuestionBank_platform/Math/"
    "Inference from sample statistics and margin of error .pdf"
)
MCQ_JSON_PATH = Path("generated_math_json/inference_margin_hybrid_mcq.json")
SPR_JSON_PATH = Path("generated_math_json/inference_margin_hybrid_spr.json")


MCQ_FIXES = {
    "85939da5": {
        "content": (
            "In a study of cell phone use, 799 randomly selected US teens were asked "
            "how often they talked on a cell phone and about their texting behavior. "
            "The data are summarized in the table above. Based on the data from the "
            "study, an estimate of the percent of US teens who are heavy texters is "
            "30% and the associated margin of error is 3%. Which of the following is "
            "a correct statement based on the given margin of error?"
        ),
        "options": [
            "Approximately 3% of the teens in the study who are classified as heavy texters are not really heavy texters.",
            "It is not possible that the percent of all US teens who are heavy texters is less than 27%.",
            "The percent of all US teens who are heavy texters is 33%.",
            "It is doubtful that the percent of all US teens who are heavy texters is 35%.",
        ],
        "correct_answer": 3,
        "explanation": (
            "Choice D is correct. The given margin of error of 3% indicates that the "
            "actual percent of all US teens who are heavy texters is likely within 3% "
            "of the estimate of 30%, or between 27% and 33%. Therefore, it is "
            "unlikely, or doubtful, that the percent of all US teens who are heavy "
            "texters would be 35%.\n\n"
            "Choice A is incorrect. The margin of error does not provide any "
            "information about the accuracy of reporting in the study. Choice B is "
            "incorrect. Based on the estimate and given margin of error, it is "
            "unlikely that the percent of all US teens who are heavy texters would be "
            "less than 27%, but it is possible. Choice C is incorrect. While the "
            "percent of all US teens who are heavy texters is likely between 27% and "
            "33%, any value within this interval is equally likely. We cannot be "
            "certain that the value is exactly 33%."
        ),
        "attach_table_image": True,
    },
    "f8f79e11": {
        "content": (
            "A park ranger asked a random sample of visitors how far they hiked "
            "during their visit. Based on the responses, the estimated mean was found "
            "to be 4.5 miles, with an associated margin of error of 0.5 miles. Which "
            "of the following is the best conclusion from these data?"
        ),
        "options": [
            "It is likely that all visitors hiked between 4 and 5 miles.",
            "It is likely that most visitors hiked exactly 4.5 miles.",
            "It is not possible that any visitor hiked less than 3 miles.",
            "It is plausible that the mean distance hiked for all visitors is between 4 and 5 miles.",
        ],
        "correct_answer": 3,
        "explanation": (
            "Choice D is correct. The given estimated mean has an associated margin "
            "of error because from sample data, the population mean cannot be "
            "determined precisely. Rather, from the sample mean, an interval can be "
            "determined within which it is plausible that the population's mean is "
            "likely to lie. Since the estimated mean is 4.5 miles with an associated "
            "margin of error of 0.5 miles, it follows that between $4.5 - 0.5$ miles "
            "and $4.5 + 0.5$ miles, or between 4 and 5 miles, is plausibly the mean "
            "distance hiked for all visitors.\n\n"
            "Choices A, B, and C are incorrect. Based on the estimated mean, no "
            "determination can be made about the number of miles hiked for all "
            "visitors to the park."
        ),
    },
    "a2162ea1": {
        "content": (
            "A company fills boxes with approximately 23 pounds of oranges. To test "
            "the accuracy of the filling process, 344 boxes of oranges were selected "
            "at random and weighed. Based on the sample, it is estimated that the "
            "average weight of all boxes of oranges filled by the company in an "
            "8-hour period is 23.1 pounds, with an associated margin of error of "
            "0.19 pounds. Which of the following is the best interpretation of this "
            "estimate?"
        ),
        "options": [
            "Plausible values for the average weight of all boxes of oranges filled by the company are between 22.91 pounds and 23.29 pounds.",
            "Plausible values for the average weight of all boxes of oranges filled by the company are less than 22.91 pounds or greater than 23.29 pounds.",
            "The average weight of all boxes of oranges filled by the company is less than 23.01 pounds.",
            "The average weight of all boxes of oranges filled by the company is greater than 23.01 pounds.",
        ],
        "correct_answer": 0,
        "explanation": (
            "Choice A is correct. It is given that the estimate for the average "
            "weight of all boxes of oranges filled by the company in an 8-hour period "
            "is 23.1 pounds, with an associated margin of error of 0.19 pounds. It "
            "follows that plausible values for this average weight are between "
            "$23.1 - 0.19$ pounds and $23.1 + 0.19$ pounds. Therefore, plausible "
            "values for the average weight of all boxes of oranges filled by the "
            "company are between 22.91 pounds and 23.29 pounds.\n\n"
            "Choice B is incorrect and may result from conceptual or calculation "
            "errors.\n\n"
            "Choice C is incorrect and may result from conceptual or calculation "
            "errors.\n\n"
            "Choice D is incorrect and may result from conceptual or calculation "
            "errors."
        ),
    },
    "308084c5": {
        "content": (
            "The results of two random samples of votes for a proposition are shown "
            "above. The samples were selected from the same population, and the "
            "margins of error were calculated using the same method. Which of the "
            "following is the most appropriate reason that the margin of error for "
            "sample A is greater than the margin of error for sample B?"
        ),
        "options": [
            "Sample A had a smaller number of votes that could not be recorded.",
            "Sample A had a higher percent of favorable responses.",
            "Sample A had a larger sample size.",
            "Sample A had a smaller sample size.",
        ],
        "correct_answer": 3,
        "explanation": (
            "Choice D is correct. Sample size is an appropriate reason for the "
            "margin of error to change. In general, a smaller sample size increases "
            "the margin of error because the sample may be less representative of the "
            "whole population.\n\n"
            "Choice A is incorrect. The margin of error will depend on the size of "
            "the sample of recorded votes, not the number of votes that could not be "
            "recorded. In any case, the smaller number of votes that could not be "
            "recorded for sample A would tend to decrease, not increase, the "
            "comparative size of the margin of error. Choice B is incorrect. Since "
            "the percent in favor for sample A is the same distance from 50% as the "
            "percent in favor for sample B, the percent of favorable responses does "
            "not affect the comparative size of the margin of error for the two "
            "samples. Choice C is incorrect. If sample A had a larger margin of error "
            "than sample B, then sample A would tend to be less representative of the "
            "population. Therefore, sample A is not likely to have a larger sample "
            "size."
        ),
        "attach_table_image": True,
    },
    "916ffe9b": {
        "content": (
            "The table shows the results of a poll. A total of 803 voters selected "
            "at random were asked which candidate they would vote for in the upcoming "
            "election. According to the poll, if 6,424 people vote in the election, "
            "by how many votes would Angel Cruz be expected to win?"
        ),
        "options": ["163", "1,304", "3,864", "5,621"],
        "correct_answer": 1,
        "explanation": (
            "Choice B is correct. It is given that 483 out of 803 voters responded "
            "that they would vote for Angel Cruz. Therefore, the proportion of voters "
            "from the poll who responded they would vote for Angel Cruz is "
            "$\\frac{483}{803}$. It is also given that there are a total of 6,424 "
            "voters in the election. Therefore, the total number of people who would "
            "be expected to vote for Angel Cruz is "
            "$6{,}424\\left(\\frac{483}{803}\\right)$, or 3,864. Since 3,864 of the "
            "6,424 total voters would be expected to vote for Angel Cruz, it follows "
            "that $6{,}424 - 3{,}864$, or 2,560 voters would be expected not to vote "
            "for Angel Cruz. The difference in the number of votes for and against "
            "Angel Cruz is $3{,}864 - 2{,}560$, or 1,304 votes. Therefore, if 6,424 "
            "people vote in the election, Angel Cruz would be expected to win by "
            "1,304 votes.\n\n"
            "Choice A is incorrect. This is the difference in the number of voters "
            "from the poll who responded that they would vote for and against Angel "
            "Cruz.\n\n"
            "Choice C is incorrect. This is the total number of people who would be "
            "expected to vote for Angel Cruz.\n\n"
            "Choice D is incorrect. This is the difference between the total number "
            "of people who vote in the election and the number of voters from the "
            "poll."
        ),
        "attach_table_image": True,
    },
}

SPR_FIXES = {
    "9ee22c16": {
        "content": (
            "A random sample of 400 town voters were asked if they plan to vote for "
            "Candidate A or Candidate B for mayor. The results were sorted by gender "
            "and are shown in the table below.\n\n"
            "The town has a total of 6,000 voters. Based on the table, what is the "
            "best estimate of the number of voters who plan to vote for Candidate A?"
        ),
        "options": ["3540"],
        "explanation": (
            "The correct answer is 3,540. According to the table, of 400 voters "
            "randomly sampled, the total number of men and women who plan to vote for "
            "Candidate A is $202 + 34 = 236$. The best estimate of the total number "
            "of voters in the town who plan to vote for Candidate A is the fraction "
            "of voters in the sample who plan to vote for Candidate A, "
            "$\\frac{236}{400}$, multiplied by the total voter population of 6,000. "
            "Therefore, the answer is "
            "$\\left(\\frac{236}{400}\\right)(6{,}000)=3{,}540$."
        ),
        "attach_table_image": True,
    }
}

TABLE_IMAGE_IDS = {"85939da5", "308084c5", "916ffe9b", "9ee22c16"}


def _find_page_index_by_id(pdf_path: Path) -> dict[str, int]:
    mapping: dict[str, int] = {}
    with pdfplumber.open(str(pdf_path)) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            match = re.search(r"Question\s+ID\s*:?\s*([a-z0-9]+)", text, re.IGNORECASE)
            if match:
                mapping[match.group(1).lower()] = index
    return mapping


def _encode_png(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _crop_table_image(pdf_path: Path, page_number: int) -> str:
    with pdfplumber.open(str(pdf_path)) as pdf:
        page = pdf.pages[page_number - 1]
        tables = [table for table in page.find_tables() if table.bbox[1] > 130]
        if not tables:
            raise ValueError(f"No question table found on page {page_number}")
        table = max(
            tables,
            key=lambda item: (item.bbox[2] - item.bbox[0]) * (item.bbox[3] - item.bbox[1]),
        )
        page_image = convert_from_path(
            str(pdf_path),
            dpi=220,
            first_page=page_number,
            last_page=page_number,
        )[0]

        width_scale = page_image.width / page.width
        height_scale = page_image.height / page.height
        x0, y0, x1, y1 = table.bbox
        pad = 8
        crop = page_image.crop(
            (
                max(0, int(x0 * width_scale) - pad),
                max(0, int(y0 * height_scale) - pad),
                min(page_image.width, int(x1 * width_scale) + pad),
                min(page_image.height, int(y1 * height_scale) + pad),
            )
        )
        return _encode_png(crop)


def _repair_file(path: Path, fixes: dict[str, dict], page_map: dict[str, int]) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    for question in data:
        qid = str(question.get("question_id", "")).lower().strip()
        if qid not in fixes:
            continue
        fix = fixes[qid]
        question.update({k: v for k, v in fix.items() if k != "attach_table_image"})
        if fix.get("attach_table_image"):
            question["image"] = _crop_table_image(PDF_PATH, page_map[qid])
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    if not PDF_PATH.exists():
        raise SystemExit(f"Missing PDF: {PDF_PATH}")
    if not MCQ_JSON_PATH.exists():
        raise SystemExit(f"Missing MCQ JSON: {MCQ_JSON_PATH}")
    if not SPR_JSON_PATH.exists():
        raise SystemExit(f"Missing SPR JSON: {SPR_JSON_PATH}")

    page_map = _find_page_index_by_id(PDF_PATH)
    missing = sorted((TABLE_IMAGE_IDS | set(MCQ_FIXES) | set(SPR_FIXES)) - set(page_map))
    if missing:
        raise SystemExit(f"Question IDs not found in PDF: {', '.join(missing)}")

    _repair_file(MCQ_JSON_PATH, MCQ_FIXES, page_map)
    _repair_file(SPR_JSON_PATH, SPR_FIXES, page_map)
    print(f"Repaired: {MCQ_JSON_PATH}")
    print(f"Repaired: {SPR_JSON_PATH}")


if __name__ == "__main__":
    main()
