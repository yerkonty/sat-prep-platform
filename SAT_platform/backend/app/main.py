from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.database import engine, Base
from app.routers import auth, questions, progress, ai_tutor, flashcards

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="SAT Prep Platform API",
    description="AI-powered Digital SAT preparation platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(questions.router)
app.include_router(progress.router)
app.include_router(ai_tutor.router)
app.include_router(flashcards.router)


@app.get("/")
def root():
    return {"message": "SAT Prep Platform API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
