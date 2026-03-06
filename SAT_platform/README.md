# Digital SAT Prep Platform - Project Documentation

## Overview

A comprehensive full-stack web application for SAT preparation featuring AI-powered tutoring, question banks, progress analytics, and subscription-based access.

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | Python REST API framework |
| SQLite | Local database (easily migratable to PostgreSQL) |
| SQLAlchemy | ORM for database |
| JWT | Token-based authentication |
| Bcrypt | Password hashing |
| OpenAI GPT-4 | AI tutor engine |

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type-safe code |
| Tailwind CSS | Styling |
| Axios | HTTP client |

---

## Project Structure

```
SAT_platform/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # Configuration settings
│   │   ├── database.py       # SQLite connection
│   │   ├── models.py         # SQLAlchemy ORM models
│   │   ├── security.py       # JWT & password utilities
│   │   ├── dependencies.py   # Auth middleware
│   │   └── routers/         # API endpoints
│   │       ├── auth.py       # Authentication
│   │       ├── questions.py  # Question bank
│   │       ├── ai_tutor.py   # AI chat
│   │       ├── progress.py   # Analytics
│   │       └── flashcards.py # Flashcards
│   ├── .env                  # Environment variables
│   ├── requirements.txt      # Python dependencies
│   └── seed_questions.py     # Sample questions
│
└── frontend/
    ├── app/
    │   ├── page.tsx          # Landing page
    │   ├── login/page.tsx    # Login page
    │   ├── register/page.tsx # Register page
    │   ├── dashboard/page.tsx # User dashboard
    │   ├── practice/page.tsx  # Question practice
    │   ├── ai-tutor/page.tsx # AI tutor chat
    │   ├── flashcards/page.tsx # Flashcards
    │   └── progress/page.tsx  # Analytics
    ├── components/
    │   └── Navbar.tsx        # Navigation
    ├── context/
    │   └── AuthContext.tsx   # Auth state
    └── lib/
        └── api.ts            # API client
```

---

## Core Features

### 1. Question Bank
- Practice questions across Reading, Writing, and Math
- Filter by category and difficulty
- Detailed explanations for each question
- Progress tracking

### 2. AI Tutor
- GPT-4 powered tutoring
- Instant explanations
- Study strategies
- Daily message limits based on subscription

### 3. Progress Analytics
- Track questions answered
- Calculate accuracy percentage
- Performance insights

### 4. Flashcards
- Create custom decks
- Review vocabulary and formulas

---

## Subscription Plans

| Feature | Free | Basic |
|---------|------|-------|
| Practice Questions | Unlimited | Unlimited |
| AI Messages | 3/day | 50/day |
| Mock Exams | 1/month | 3/month |
| Question Sets | - | Custom random sets |
| Flashcards | Basic | Custom |

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Questions
- `GET /api/questions` - Get questions with filters
- `GET /api/questions/types` - Get question types
- `GET /api/questions/categories` - Get categories
- `POST /api/questions/answer` - Submit answer

### AI Tutor
- `POST /api/ai/chat` - Chat with AI

### Progress
- `GET /api/progress/analytics` - Get analytics

### Flashcards
- `GET /api/flashcards/decks` - Get decks
- `POST /api/flashcards/decks` - Create deck

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm or yarn

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
python seed_questions.py
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Configuration

### Backend (.env)
```
DATABASE_URL=sqlite:///./sat_platform.db
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
FRONTEND_URL=http://localhost:3000
```

---

## Learning Outcomes

- RESTful API development with FastAPI
- Database design with SQLAlchemy
- JWT authentication implementation
- Modern frontend with Next.js 16
- TypeScript best practices
- Tailwind CSS styling

---

*Project for educational purposes*
