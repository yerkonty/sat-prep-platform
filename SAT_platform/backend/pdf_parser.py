"""PDF Parser for College Board SAT Question Bank PDFs - v4."""
import re
import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional

import pdfplumber


def extract_questions_from_pdf(pdf_path: str) -> List[Dict]:
    """Extract structured questions from College Board PDF."""
    
    questions = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text or "Question ID" not in text:
                continue
            
            question_data = parse_page(text)
            if question_data:
                questions.append(question_data)
    
    return questions


def parse_page(text: str) -> Optional[Dict]:
    """Parse a single page containing a question."""
    
    lines = text.split('\n')
    
    # Extract Question ID
    id_match = re.search(r'Question ID\s+([a-f0-9]+)', text, re.IGNORECASE)
    question_id = id_match.group(1) if id_match else str(uuid.uuid4())
    
    # Parse domain and skill from "SAT Reading and Writing ..." line
    domain = ""
    skill = ""
    domain_match = re.search(r'SAT Reading and Writing\s+([^\n]+)', text)
    if domain_match:
        domain_skill = domain_match.group(1).strip()
        if "Information and" in domain_skill:
            domain = "Information and Ideas"
            skill = domain_skill.replace("Information and", "").strip()
        elif "Craft and" in domain_skill:
            domain = "Craft and Structure"
            skill = domain_skill.replace("Craft and", "").strip()
        elif "Expression of" in domain_skill:
            domain = "Expression of Ideas"
            skill = domain_skill.replace("Expression of", "").strip()
        elif "Standard English" in domain_skill:
            domain = "Standard English Conventions"
            skill = domain_skill.replace("Standard English", "").strip()
        else:
            domain = domain_skill.strip()
            skill = ""
    
    # Extract Difficulty
    diff_match = re.search(r'Question Difficulty:\s*([A-Za-z]+)', text, re.IGNORECASE)
    difficulty = diff_match.group(1).strip().lower() if diff_match else "medium"
    
    # Extract correct answer
    answer_match = re.search(r'Correct Answer:\s*([A-D])', text, re.IGNORECASE)
    correct_letter = answer_match.group(1) if answer_match else "A"
    
    # Map letter to index
    letter_to_index = {"A": 0, "B": 1, "C": 2, "D": 3}
    correct_index = letter_to_index.get(correct_letter, 0)
    
    # Extract rationale - stop at "Question Difficulty:"
    rationale_match = re.search(r'Rationale\s*(.+?)(?:Question Difficulty:|$)', text, re.DOTALL)
    rationale = rationale_match.group(1).strip() if rationale_match else ""
    
    # Extract options - stop at "ID: xxxxx Answer"
    # First, isolate the question/option section
    question_section_match = re.search(r'ID:\s*[a-f0-9]+\n(.+?)(?:ID:\s*[a-f0-9]+\s+Answer)', text, re.DOTALL)
    if not question_section_match:
        return None
    
    question_section = question_section_match.group(1)
    
    # Extract each option
    options = {}
    for letter in ["A", "B", "C", "D"]:
        pattern = rf'{letter}\.\s*([^\n]+(?:\n(?![A-D]\.)[^\n]+)*)'
        match = re.search(pattern, question_section)
        if match:
            opt_text = match.group(1).strip()
            opt_text = re.sub(r'\s+', ' ', opt_text)
            options[letter] = opt_text
    
    # Extract content - everything before option A
    content_match = re.search(r'^(.+?)[A]\.', question_section, re.DOTALL)
    if content_match:
        content = content_match.group(1).strip()
        content = re.sub(r'\s+', ' ', content)
    else:
        content = ""
    
    if not content or len(options) < 4:
        return None
    
    # Convert options to list
    options_list = [options.get(letter, "") for letter in ["A", "B", "C", "D"]]
    
    return {
        "question_id": question_id,
        "domain": domain,
        "skill": skill,
        "difficulty": difficulty,
        "section": "reading_writing",
        "content": content,
        "options": options_list,
        "correct_answer": correct_index,
        "explanation": rationale,
    }


def export_to_json(questions: List[Dict], output_path: str):
    """Export questions to JSON file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    print(f"Exported {len(questions)} questions to {output_path}")


if __name__ == "__main__":
    pdf_path = r"C:\Users\Asus\OneDrive\Desktop\SAT\Verbal\InferencesQBwithanswers.pdf"
    output_path = r"C:\Users\Asus\OneDrive\Desktop\SAT\Verbal\inferences_output.json"
    
    print(f"Parsing: {pdf_path}")
    questions = extract_questions_from_pdf(pdf_path)
    print(f"Found {len(questions)} questions")
    
    # Show sample
    if questions:
        q = questions[0]
        print(f"\n=== Sample Question ===")
        print(f"ID: {q.get('question_id')}")
        print(f"Domain: {q.get('domain')}")
        print(f"Skill: {q.get('skill')}")
        print(f"Difficulty: {q.get('difficulty')}")
        print(f"Content: {q.get('content', '')[:150]}...")
        print(f"Options:")
        for i, opt in enumerate(q.get('options', [])):
            print(f"  {chr(65+i)}: {opt[:80]}...")
        print(f"Correct Answer Index: {q.get('correct_answer')}")
        print(f"Explanation: {q.get('explanation', '')[:150]}...")
    
    if questions:
        export_to_json(questions, output_path)
