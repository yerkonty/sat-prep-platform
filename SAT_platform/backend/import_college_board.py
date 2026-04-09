"""Import College Board questions from PDF parser output into database."""
import uuid
import json
import os

from sqlalchemy.orm import Session

from app.database import Base, engine, SessionLocal
from app.migrations import run_startup_migrations
from app.models import Question


def import_questions_from_json(json_path: str, section: str, default_domain: str = "", default_skill: str = "") -> dict:
    """Import questions from JSON file into database."""
    
    with open(json_path, 'r', encoding='utf-8') as f:
        questions_data = json.load(f)
    
    run_startup_migrations(engine)
    Base.metadata.create_all(bind=engine)
    
    counts = {"inserted": 0, "updated": 0, "skipped": 0}
    session: Session = SessionLocal()
    
    try:
        for q in questions_data:
            # Generate unique ID
            q_id = str(uuid.uuid4())
            
            # Use the external_id from PDF, but ensure uniqueness
            external_id = q.get("question_id", str(uuid.uuid4()))
            
            # Check if already exists
            existing = session.query(Question).filter_by(external_id=external_id).first()
            
            if existing:
                # Update existing
                existing.section = section
                existing.domain = q.get("domain") or default_domain
                existing.skill = q.get("skill") or default_skill
                existing.subcategory = q.get("subcategory", "")
                existing.difficulty = q.get("difficulty", "medium")
                existing.content = q.get("content", "")
                existing.options = q.get("options", [])
                existing.correct_answer = q.get("correct_answer", 0)
                existing.explanation = q.get("explanation", "")
                existing.source = "College Board"
                counts["updated"] += 1
            else:
                # Insert new
                new_question = Question(
                    id=q_id,
                    external_id=external_id,
                    section=section,
                    type=section,
                    category=q.get("domain") or default_domain,
                    domain=q.get("domain") or default_domain,
                    skill=q.get("skill") or default_skill,
                    subcategory=q.get("subcategory", ""),
                    difficulty=q.get("difficulty", "medium"),
                    content=q.get("content", ""),
                    options=q.get("options", []),
                    correct_answer=q.get("correct_answer", 0),
                    explanation=q.get("explanation", ""),
                    source="College Board",
                )
                session.add(new_question)
                counts["inserted"] += 1
        
        session.commit()
        return counts
    
    finally:
        session.close()


def process_all_verbal_pdfs():
    """Process all Verbal PDFs and import to database."""
    
    verbal_dir = r"C:\Users\Asus\OneDrive\Desktop\SAT\Verbal"
    output_dir = r"C:\Users\Asus\OneDrive\Desktop\SAT\Verbal\parsed"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # PDF mappings: (filename, section, domain, skill)
    pdf_mappings = [
        ("InferencesQBwithanswers.pdf", "reading_writing", "Information and Ideas", "Inferences"),
        ("TransitionsQBanswers.pdf", "reading_writing", "Expression of Ideas", "Transitions"),
        ("BoundariesQBanswers.pdf", "reading_writing", "Standard English Conventions", "Boundaries"),
        ("FormStructureSenseQBanswers.pdf", "reading_writing", "Standard English Conventions", "Form, Structure, and Sense"),
        ("NotesQBanswers.pdf", "reading_writing", "Expression of Ideas", "Rhetorical Synthesis"),
        ("CraftAndStructureAnswers.pdf", "reading_writing", "Craft and Structure", "Cross-Text Connections"),
    ]
    
    total_inserted = 0
    total_updated = 0
    
    from pdf_parser import extract_questions_from_pdf
    
    for pdf_name, section, default_domain, default_skill in pdf_mappings:
        pdf_path = os.path.join(verbal_dir, pdf_name)
        
        if not os.path.exists(pdf_path):
            print(f"Skipping {pdf_name} - not found")
            continue
        
        print(f"Processing {pdf_name}...")
        
        # Extract questions
        questions = extract_questions_from_pdf(pdf_path)
        
        # Override domain/skill with values from mapping
        for q in questions:
            q["domain"] = default_domain
            q["skill"] = default_skill
        
        # Save to JSON
        json_name = pdf_name.replace(".pdf", ".json")
        json_path = os.path.join(output_dir, json_name)
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        
        print(f"  Saved {len(questions)} questions to {json_name}")
        
        # Import to database
        counts = import_questions_from_json(json_path, section, default_domain, default_skill)
        print(f"  Database: inserted={counts['inserted']}, updated={counts['updated']}, skipped={counts['skipped']}")
        
        total_inserted += counts["inserted"]
        total_updated += counts["updated"]
    
    print(f"\n=== Total ===")
    print(f"Inserted: {total_inserted}")
    print(f"Updated: {total_updated}")


if __name__ == "__main__":
    process_all_verbal_pdfs()
