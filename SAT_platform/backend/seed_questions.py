from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import uuid

DATABASE_URL = "sqlite:///./sat_platform.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.models import Question

questions_data = [
    # Math Questions
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "easy",
        "content": "If 3x + 7 = 22, what is the value of x?",
        "options": ["3", "5", "7", "15"],
        "correct_answer": 1,
        "explanation": "3x + 7 = 22\n3x = 22 - 7\n3x = 15\nx = 15/3 = 5",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "medium",
        "content": "What is the slope of the line that passes through points (2, 5) and (6, 13)?",
        "options": ["2", "3", "4", "8"],
        "correct_answer": 0,
        "explanation": "Slope = (y2 - y1) / (x2 - x1) = (13 - 5) / (6 - 2) = 8/4 = 2",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "geometry",
        "difficulty": "easy",
        "content": "What is the area of a rectangle with length 8 and width 5?",
        "options": ["13", "26", "40", "80"],
        "correct_answer": 2,
        "explanation": "Area = length × width = 8 × 5 = 40",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "hard",
        "content": "If f(x) = 2x² - 3x + 1, what is f(3)?",
        "options": ["10", "13", "16", "19"],
        "correct_answer": 1,
        "explanation": "f(3) = 2(9) - 3(3) + 1 = 18 - 9 + 1 = 10",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "statistics",
        "difficulty": "medium",
        "content": "The average of 5 numbers is 20. If one number is removed, the average becomes 18. What number was removed?",
        "options": ["10", "20", "28", "38"],
        "correct_answer": 2,
        "explanation": "Total = 5 × 20 = 100. New total with 4 numbers = 4 × 18 = 72. Removed number = 100 - 72 = 28",
        "source": "SAT Practice Test 2"
    },
    # Reading Questions
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "easy",
        "content": "The word 'ubiquitous' most nearly means:",
        "options": ["Rare", "Everywhere", "Ancient", "Beautiful"],
        "correct_answer": 1,
        "explanation": "Ubiquitous means present, appearing, or found everywhere.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "medium",
        "content": "The word 'ephemeral' most nearly means:",
        "options": ["Lasting forever", "Short-lived", "Extremely bright", "Very small"],
        "correct_answer": 1,
        "explanation": "Ephemeral means lasting for a very short time.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "reading",
        "category": "comprehension",
        "difficulty": "hard",
        "content": "Based on the passage, the author's main purpose is to:",
        "options": ["Entertain readers with a story", "Persuade readers to take action", "Explain a scientific concept", "Describe a historical event"],
        "correct_answer": 2,
        "explanation": "The passage primarily explains a scientific concept through detailed examples and explanations.",
        "source": "SAT Practice Test 3"
    },
    # Writing Questions
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "easy",
        "content": "Choose the correct sentence:",
        "options": ["Their going to the store.", "They're going to the store.", "There going to the store.", "There going to store."],
        "correct_answer": 1,
        "explanation": "'They're' is the contraction of 'they are', which is correct here.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "medium",
        "content": "Choose the correct sentence:",
        "options": ["The data shows that sales have increased.", "The data show that sales have increased.", "The data showing that sales have increased.", "The data is showing that sales have increased."],
        "correct_answer": 0,
        "explanation": "In formal writing, 'data' is treated as plural, so 'show' should be used. However, 'shows' is increasingly accepted in modern usage.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "hard",
        "content": "Which choice best combines the two sentences? 'The project was difficult. It was completed on time.'",
        "options": ["The project was difficult, and it was completed on time.", "Although the project was difficult, it was completed on time.", "The project was difficult; therefore, it was completed on time.", "The difficult project was completed on time."],
        "correct_answer": 1,
        "explanation": "This choice best shows the contrast between difficulty and timely completion using 'although'.",
        "source": "SAT Practice Test 3"
    },
    {
        "type": "math",
        "category": "geometry",
        "difficulty": "medium",
        "content": "What is the circumference of a circle with radius 7? (Use π = 22/7)",
        "options": ["22", "44", "154", "308"],
        "correct_answer": 1,
        "explanation": "Circumference = 2πr = 2 × (22/7) × 7 = 44",
        "source": "SAT Practice Test 1"
    },
]

def seed_questions():
    db = SessionLocal()
    try:
        # Check if questions already exist
        existing = db.query(Question).count()
        if existing > 0:
            print(f"Database already has {existing} questions")
            return

        for q in questions_data:
            question = Question(
                id=str(uuid.uuid4()),
                type=q["type"],
                category=q["category"],
                difficulty=q["difficulty"],
                content=q["content"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
                source=q["source"]
            )
            db.add(question)
        
        db.commit()
        print(f"Successfully added {len(questions_data)} questions!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_questions()
