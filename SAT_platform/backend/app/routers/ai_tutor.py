from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import uuid

from app.database import get_db
from app.models import User
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/ai", tags=["AI Tutor"])


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    messages_remaining: int


SYSTEM_PROMPT = """You are an expert SAT tutor. Help students understand:
- Reading and Writing questions
- Math problems (algebra, geometry, data analysis)
- Test strategies and time management
- Provide clear, educational explanations

Always encourage students and adapt to their learning level."""


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
    
    if not settings.OPENAI_API_KEY:
        return ChatResponse(
            response="AI tutor is not configured. Please add OPENAI_API_KEY to .env file.",
            messages_remaining=current_user.ai_messages_limit - current_user.ai_messages_used
        )
    
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    
    if request.context:
        messages.append({"role": "user", "content": f"Context: {request.context}"})
    
    messages.append({"role": "user", "content": request.message})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500
        )
        
        ai_response = response.choices[0].message.content
        
        current_user.ai_messages_used += 1
        db.commit()
        
        return ChatResponse(
            response=ai_response,
            messages_remaining=current_user.ai_messages_limit - current_user.ai_messages_used
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
