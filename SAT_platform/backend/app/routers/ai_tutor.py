from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Any, Optional, List, Literal

from app.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/ai", tags=["AI Tutor"])

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
MAX_HISTORY_MESSAGES = 20


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    response: str
    messages_remaining: int


SYSTEM_PROMPT = """You are an expert SAT tutor. Help students understand:
- Reading and Writing questions
- Math problems (algebra, geometry, data analysis)
- Test strategies and time management
- Provide clear, educational explanations

Always encourage students and adapt to their learning level."""


def _build_client():
    """Pick a provider based on which key is configured. Groq preferred."""
    from openai import OpenAI

    if settings.GROQ_API_KEY:
        return OpenAI(api_key=settings.GROQ_API_KEY, base_url=GROQ_BASE_URL), settings.GROQ_MODEL
    if settings.OPENAI_API_KEY:
        return OpenAI(api_key=settings.OPENAI_API_KEY), "gpt-4o-mini"
    return None, None


@router.post("/chat", response_model=ChatResponse)
def chat_with_tutor(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Chat with AI tutor"""
    if current_user.ai_messages_used >= current_user.ai_messages_limit:
        raise HTTPException(
            status_code=429,
            detail="AI message limit reached. Upgrade your plan for more messages."
        )

    client, model = _build_client()
    if client is None or model is None:
        # pyrefly: ignore[bad-argument-type]
        return ChatResponse(
            response="AI tutor is not configured. Please add GROQ_API_KEY to .env file.",
            messages_remaining=current_user.ai_messages_limit - current_user.ai_messages_used
        )

    messages: list[Any] = [{"role": "system", "content": SYSTEM_PROMPT}]
    if request.context:
        messages.append({"role": "system", "content": f"Context: {request.context}"})
    for m in request.history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": request.message})

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=600,
            temperature=0.7,
            stream=False,
        )
        # pyrefly: ignore[missing-attribute]
        ai_response = response.choices[0].message.content or ""

        current_user.ai_messages_used += 1
        db.commit()

        # pyrefly: ignore[bad-argument-type]
        return ChatResponse(
            response=ai_response,
            messages_remaining=current_user.ai_messages_limit - current_user.ai_messages_used
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="AI service unavailable")
