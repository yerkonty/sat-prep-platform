from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base
from app.migrations import run_startup_migrations
from app.seed_flashcards import seed_shared_decks
from app.config import settings
from app.routers import auth, questions, progress, ai_tutor, flashcards, exam, admin, leaderboard

run_startup_migrations(engine)
Base.metadata.create_all(bind=engine)
seed_shared_decks(engine)

app = FastAPI(
    title="SAT Prep Platform API",
    description="AI-powered Digital SAT preparation platform",
    version="1.0.0"
)

_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in _origins:
    _origins.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response

app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(progress.router)
app.include_router(ai_tutor.router)
app.include_router(flashcards.router)
app.include_router(exam.router)
app.include_router(admin.router)
app.include_router(leaderboard.router)


@app.get("/")
def root():
    return {"message": "SAT Prep Platform API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
