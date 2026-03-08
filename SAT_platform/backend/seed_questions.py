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
    # More Math Questions
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "easy",
        "content": "Solve for x: 2x - 8 = 14",
        "options": ["3", "6", "11", "22"],
        "correct_answer": 2,
        "explanation": "2x - 8 = 14\n2x = 14 + 8\n2x = 22\nx = 11",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "easy",
        "content": "If 5x = 35, what is x?",
        "options": ["5", "7", "30", "40"],
        "correct_answer": 1,
        "explanation": "5x = 35\nx = 35/5 = 7",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "medium",
        "content": "What is the y-intercept of the line y = 3x + 7?",
        "options": ["3", "7", "10", "21"],
        "correct_answer": 1,
        "explanation": "In y = mx + b form, b is the y-intercept. Here b = 7.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "medium",
        "content": "Simplify: (3x² + 2x) - (x² - 4x)",
        "options": ["2x² - 2x", "2x² + 6x", "4x² - 2x", "4x² + 6x"],
        "correct_answer": 1,
        "explanation": "(3x² + 2x) - (x² - 4x) = 3x² + 2x - x² + 4x = 2x² + 6x",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "algebra",
        "difficulty": "hard",
        "content": "If x² - 5x + 6 = 0, what are the solutions for x?",
        "options": ["1 and 6", "2 and 3", "-2 and -3", "1 and 5"],
        "correct_answer": 1,
        "explanation": "Factor: (x-2)(x-3) = 0, so x = 2 or x = 3",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "geometry",
        "difficulty": "easy",
        "content": "What is the area of a triangle with base 6 and height 8?",
        "options": ["14", "24", "28", "48"],
        "correct_answer": 1,
        "explanation": "Area = ½ × base × height = ½ × 6 × 8 = 24",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "geometry",
        "difficulty": "medium",
        "content": "A right triangle has legs of length 3 and 4. What is the hypotenuse?",
        "options": ["5", "7", "12", "25"],
        "correct_answer": 0,
        "explanation": "Using Pythagorean theorem: 3² + 4² = c²\n9 + 16 = c²\n25 = c²\nc = 5",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "geometry",
        "difficulty": "medium",
        "content": "What is the volume of a rectangular prism with dimensions 4, 5, and 6?",
        "options": ["15", "54", "60", "120"],
        "correct_answer": 3,
        "explanation": "Volume = length × width × height = 4 × 5 × 6 = 120",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "geometry",
        "difficulty": "hard",
        "content": "A circle has an area of 64π. What is its radius?",
        "options": ["4", "8", "16", "32"],
        "correct_answer": 1,
        "explanation": "Area = πr² = 64π\nr² = 64\nr = 8",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "statistics",
        "difficulty": "easy",
        "content": "What is the median of the, 7 set: 3, 2, 9, 5?",
        "options": ["3", "5", "7", "9"],
        "correct_answer": 1,
        "explanation": "Order: 2, 3, 5, 7, 9. The middle value is 5.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "statistics",
        "difficulty": "easy",
        "content": "What is the mode of: 4, 2, 4, 3, 2, 4, 1?",
        "options": ["2", "3", "4", "2.5"],
        "correct_answer": 2,
        "explanation": "4 appears 3 times, 2 appears 2 times. Mode is 4.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "statistics",
        "difficulty": "medium",
        "content": "Find the range of: 12, 5, 22, 30, 7",
        "options": ["5", "17", "25", "30"],
        "correct_answer": 2,
        "explanation": "Range = max - min = 30 - 5 = 25",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "problem-solving",
        "difficulty": "easy",
        "content": "If a car travels 120 miles in 2 hours, what is its average speed?",
        "options": ["40 mph", "50 mph", "60 mph", "80 mph"],
        "correct_answer": 2,
        "explanation": "Speed = distance/time = 120/2 = 60 mph",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "problem-solving",
        "difficulty": "medium",
        "content": "A store offers 25% off. What is the sale price of a $80 item?",
        "options": ["$20", "$55", "$60", "$65"],
        "correct_answer": 2,
        "explanation": "Discount = 0.25 × 80 = $20\nSale price = 80 - 20 = $60",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "math",
        "category": "problem-solving",
        "difficulty": "medium",
        "content": "If 3 workers can complete a task in 6 days, how long would 9 workers take?",
        "options": ["2 days", "3 days", "9 days", "18 days"],
        "correct_answer": 0,
        "explanation": "Work = workers × days. 3 × 6 = 9 × d\nd = 18/9 = 2 days",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "math",
        "category": "problem-solving",
        "difficulty": "hard",
        "content": "A recipe calls for 2 cups of flour to make 24 cookies. How much flour is needed for 60 cookies?",
        "options": ["3 cups", "4 cups", "5 cups", "6 cups"],
        "correct_answer": 2,
        "explanation": "Ratio: 2/24 = x/60\n2 × 60 = 24x\n120 = 24x\nx = 5 cups",
        "source": "SAT Practice Test 2"
    },
    # More Reading/Vocabulary Questions
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "easy",
        "content": "The word 'benevolent' most nearly means:",
        "options": ["Cruel", "Kind", "Angry", "Sad"],
        "correct_answer": 1,
        "explanation": "Benevolent means well-meaning and kindly.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "easy",
        "content": "The word 'meticulous' most nearly means:",
        "options": ["Careless", "Careful", "Quick", "Quiet"],
        "correct_answer": 1,
        "explanation": "Meticulous means showing great attention to detail.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "medium",
        "content": "The word 'pragmatic' most nearly means:",
        "options": ["Idealistic", "Practical", "Artistic", "Mystical"],
        "correct_answer": 1,
        "explanation": "Pragmatic means dealing with things sensibly and realistically.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "medium",
        "content": "The word 'ambiguous' most nearly means:",
        "options": ["Clear", "Uncertain", "Important", "Simple"],
        "correct_answer": 1,
        "explanation": "Ambiguous means open to more than one interpretation.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "medium",
        "content": "The word 'prolific' most nearly means:",
        "options": ["Rare", "Productive", "Famous", "Wealthy"],
        "correct_answer": 1,
        "explanation": "Prolific means producing much fruit or many offspring, or highly productive.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "hard",
        "content": "The word 'surreptitious' most nearly means:",
        "options": ["Public", "Secret", "Dangerous", "Beautiful"],
        "correct_answer": 1,
        "explanation": "Surreptitious means kept secret, especially because it would not be approved of.",
        "source": "SAT Practice Test 3"
    },
    {
        "type": "reading",
        "category": "vocabulary",
        "difficulty": "hard",
        "content": "The word 'cacophony' most nearly means:",
        "options": ["Harmony", "Loud noise", "Silence", "Music"],
        "correct_answer": 1,
        "explanation": "Cacophony means a harsh, discordant mixture of sounds.",
        "source": "SAT Practice Test 3"
    },
    {
        "type": "reading",
        "category": "comprehension",
        "difficulty": "easy",
        "content": "The author's tone in the passage can best be described as:",
        "options": ["Humorous", "Informative", "Angry", "Sarcastic"],
        "correct_answer": 1,
        "explanation": "The author presents facts in a factual, educational manner.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "reading",
        "category": "comprehension",
        "difficulty": "medium",
        "content": "Which statement best summarizes the main idea of the passage?",
        "options": ["Technology is harmful", "Climate change requires action", "Animals are interesting", "History repeats itself"],
        "correct_answer": 1,
        "explanation": "The passage focuses on the need to address climate change.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "reading",
        "category": "comprehension",
        "difficulty": "hard",
        "content": "The author uses the phrase 'tip of the iceberg' to suggest that:",
        "options": ["The problem is small", "Only surface issues are visible", "The solution is obvious", "The data is complete"],
        "correct_answer": 1,
        "explanation": "This phrase indicates that only a small portion of a larger problem is visible.",
        "source": "SAT Practice Test 3"
    },
    # More Writing/Grammar Questions
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "easy",
        "content": "Choose the correct sentence:",
        "options": ["Its raining outside.", "It's raining outside.", "Its' raining outside.", "Its raining outside."],
        "correct_answer": 1,
        "explanation": "'It's' is the contraction of 'it is'.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "easy",
        "content": "Choose the correct sentence:",
        "options": ["Your welcome.", "You're welcome.", "Youre welcome.", "Yore welcome."],
        "correct_answer": 1,
        "explanation": "'You're' is the contraction of 'you are'.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "easy",
        "content": "Choose the correct sentence:",
        "options": ["She dont like apples.", "She doesn't like apples.", "She doesnot like apples.", "She not like apples."],
        "correct_answer": 1,
        "explanation": "Third person singular uses 'doesn't'.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "medium",
        "content": "Choose the correct sentence:",
        "options": ["Me and him went to the store.", "Him and me went to the store.", "He and I went to the store.", "I and he went to the store."],
        "correct_answer": 2,
        "explanation": "Use subject pronouns 'He and I' as the subject of the sentence.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "medium",
        "content": "Choose the correct sentence:",
        "options": ["Everyone need to study.", "Everyone needs to study.", "Everyone need to studying.", "Everyone needs study."],
        "correct_answer": 1,
        "explanation": "'Everyone' is singular and takes 'needs' (third person singular).",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "medium",
        "content": "Choose the correct sentence:",
        "options": ["Neither the students nor the teacher were present.", "Neither the students nor the teacher was present.", "Neither the students or the teacher were present.", "Neither the students or the teacher was present."],
        "correct_answer": 1,
        "explanation": "With 'neither...nor', the verb agrees with the nearer subject (teacher).",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "writing",
        "category": "grammar",
        "difficulty": "hard",
        "content": "Choose the correct sentence:",
        "options": ["Who do you think will win?", "Whom do you think will win?", "Whose do you think will win?", "Who you think will win?"],
        "correct_answer": 0,
        "explanation": "'Who' is correct as it is the subject of 'will win' in the dependent clause.",
        "source": "SAT Practice Test 3"
    },
    {
        "type": "writing",
        "category": "punctuation",
        "difficulty": "easy",
        "content": "Choose the correct punctuation: 'I love reading books however I dont have much time'",
        "options": ["...books; however, I...", "...books, however I...", "...books however, I...", "...books however I..."],
        "correct_answer": 0,
        "explanation": "Use semicolon before 'however' when joining independent clauses.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "punctuation",
        "difficulty": "medium",
        "content": "Choose the correct punctuation: 'The conference scheduled for Monday has been postponed'",
        "options": ["conference, scheduled", "conference scheduled", "conference; scheduled", "conference: scheduled"],
        "correct_answer": 1,
        "explanation": "No punctuation needed - the modifier is essential without commas.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "writing",
        "category": "sentence-structure",
        "difficulty": "easy",
        "content": "Which sentence is a fragment?",
        "options": ["She walked to the store.", "Because she was tired.", "The dog barked loudly.", "We went home."],
        "correct_answer": 1,
        "explanation": "'Because she was tired' is a dependent clause and needs an independent clause.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "sentence-structure",
        "difficulty": "medium",
        "content": "Which sentence has correct parallel structure?",
        "options": ["I like reading, to run, and painting.", "I like reading, running, and to paint.", "I like reading, running, and painting.", "I like reading, to run, and to paint."],
        "correct_answer": 2,
        "explanation": "All items should be in the same grammatical form: gerunds.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "writing",
        "category": "word-choice",
        "difficulty": "easy",
        "content": "Choose the best word: 'The results were _______ than expected.'",
        "options": ["more good", "better", "more better", "gooder"],
        "correct_answer": 1,
        "explanation": "'Better' is the comparative form of 'good'.",
        "source": "SAT Practice Test 1"
    },
    {
        "type": "writing",
        "category": "word-choice",
        "difficulty": "medium",
        "content": "Choose the best word: 'She was _______ in the library when the fire alarm went off.'",
        "options": ["setting", "sitting", "sit", "sat"],
        "correct_answer": 1,
        "explanation": "'Sitting' is the present participle describing her location.",
        "source": "SAT Practice Test 2"
    },
    {
        "type": "writing",
        "category": "word-choice",
        "difficulty": "hard",
        "content": "Choose the best word: 'The scientist's findings were _______ by the academic community.'",
        "options": ["accepted", "received", "welcomed", "embraced"],
        "correct_answer": 3,
        "explanation": "'Embraced' suggests both acceptance and enthusiasm.",
        "source": "SAT Practice Test 3"
    },
    {
        "type": "writing",
        "category": "logic",
        "difficulty": "medium",
        "content": "Which choice provides the best transition between paragraphs?",
        "options": ["In conclusion", "However", "First of all", "As a result"],
        "correct_answer": 1,
        "explanation": "'However' shows contrast and is appropriate for transitions.",
        "source": "SAT Practice Test 2"
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
