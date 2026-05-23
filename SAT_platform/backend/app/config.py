from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./sat_platform.db"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    ANTHROPIC_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"


settings = Settings()
