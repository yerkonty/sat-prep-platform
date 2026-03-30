from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models import User
from app.security import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user"""
    try:
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        user = User(
            id=str(uuid.uuid4()),
            email=request.email,
            password_hash=get_password_hash(request.password),
            name=request.name,
            subscription_plan="free",
            ai_messages_limit=3
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        access_token = create_access_token(
            data={"sub": user.id},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "subscription_plan": user.subscription_plan
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login and get access token"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "subscription_plan": user.subscription_plan
        }
    )


class ProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    subscription_plan: str
    ai_messages_used: int
    ai_messages_limit: int
    created_at: str
    email_verified: bool


class UpdateProfileRequest(BaseModel):
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user profile"""
    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        subscription_plan=current_user.subscription_plan,
        ai_messages_used=current_user.ai_messages_used,
        ai_messages_limit=current_user.ai_messages_limit,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
        email_verified=bool(current_user.email_verified)
    )


@router.put("/profile")
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    current_user.name = request.name
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "subscription_plan": current_user.subscription_plan
    }


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    current_user.password_hash = get_password_hash(request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class VerificationRequest(BaseModel):
    token: str


@router.post("/request-password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Issue a password reset token (dev-mode response includes token)."""
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        user.reset_token = str(uuid.uuid4())
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()
    # Respond generically to avoid email enumeration; include token for dev/testing
    return {"message": "If the email exists, a reset link was issued.", "reset_token": user.reset_token if user else None}


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Reset password using a valid token."""
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user.password_hash = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password has been reset"}


@router.post("/request-verification")
def request_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Issue an email verification token (dev-mode response includes token)."""
    current_user.verification_token = str(uuid.uuid4())
    db.commit()
    return {"message": "Verification issued", "verification_token": current_user.verification_token}


@router.post("/verify-email")
def verify_email(payload: VerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    user.email_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified"}
