from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from typing import Optional
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models import User, InviteLink, RefreshToken
from app.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token_value,
)
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _set_auth_cookies(response: Response, refresh_token: str, role: str) -> None:
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=max_age,
    )
    response.set_cookie(
        key="logged_in",
        value="true",
        httponly=False,
        secure=True,
        samesite="lax",
        max_age=max_age,
    )
    response.set_cookie(
        key="user_role",
        value=role,
        httponly=False,
        secure=True,
        samesite="lax",
        max_age=max_age,
    )


def _clear_auth_cookies(response: Response) -> None:
    for key in ("refresh_token", "logged_in", "user_role"):
        response.delete_cookie(key=key)


def _issue_tokens(
    user: User, db: Session, response: Response
) -> str:
    access_token = create_access_token(
        data={"sub": user.id, "role": user.role},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    rt_value = create_refresh_token_value()
    rt = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token=rt_value,
        expires_at=_utcnow_naive() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    _set_auth_cookies(response, rt_value, user.role)
    return access_token


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "subscription_plan": user.subscription_plan,
        "role": user.role,
        "is_active": user.is_active,
    }


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    invite_token: str


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class ProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    subscription_plan: str
    ai_messages_used: int
    ai_messages_limit: int
    created_at: str
    email_verified: bool
    role: str
    is_active: bool


class UpdateProfileRequest(BaseModel):
    name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class VerificationRequest(BaseModel):
    token: str


# ---------- Registration (invite-gated) ----------

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    invite = (
        db.query(InviteLink)
        .filter(InviteLink.token == request.invite_token, InviteLink.is_active == True)
        .first()
    )
    if not invite:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite link")
    if invite.expires_at and invite.expires_at < _utcnow_naive():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite link has expired")
    if invite.max_uses is not None and invite.uses_count >= invite.max_uses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite link has reached its limit")

    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=request.email,
        password_hash=get_password_hash(request.password),
        name=request.name,
        subscription_plan="free",
        ai_messages_limit=3,
        role="student",
    )
    db.add(user)

    invite.uses_count += 1
    if invite.max_uses is not None and invite.uses_count >= invite.max_uses:
        invite.is_active = False

    db.commit()
    db.refresh(user)

    access_token = _issue_tokens(user, db, response)
    return AuthResponse(access_token=access_token, token_type="bearer", user=_user_dict(user))


# ---------- Login ----------

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    user.last_active = _utcnow_naive()
    db.commit()

    access_token = _issue_tokens(user, db, response)
    return AuthResponse(access_token=access_token, token_type="bearer", user=_user_dict(user))


# ---------- Invite validation (public) ----------

@router.get("/join/{token}")
def validate_invite(token: str, db: Session = Depends(get_db)):
    invite = (
        db.query(InviteLink)
        .filter(InviteLink.token == token, InviteLink.is_active == True)
        .first()
    )
    if not invite:
        return {"valid": False, "reason": "Invalid invite link"}
    if invite.expires_at and invite.expires_at < _utcnow_naive():
        return {"valid": False, "reason": "Invite link has expired"}
    if invite.max_uses is not None and invite.uses_count >= invite.max_uses:
        return {"valid": False, "reason": "Invite link has reached its limit"}
    return {"valid": True}


# ---------- Refresh ----------

@router.post("/refresh")
def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == refresh_token,
            RefreshToken.is_revoked == False,
        )
        .first()
    )
    if not rt or rt.expires_at < _utcnow_naive():
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user or not user.is_active:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    rt.is_revoked = True
    db.commit()

    access_token = _issue_tokens(user, db, response)
    return {"access_token": access_token, "token_type": "bearer"}


# ---------- Logout ----------

@router.post("/logout")
def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if refresh_token:
        rt = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
        if rt:
            rt.is_revoked = True
            db.commit()

    _clear_auth_cookies(response)
    return {"message": "Logged out"}


# ---------- Profile ----------

@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ProfileResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        subscription_plan=current_user.subscription_plan,
        ai_messages_used=current_user.ai_messages_used,
        ai_messages_limit=current_user.ai_messages_limit,
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
        email_verified=bool(current_user.email_verified),
        role=current_user.role,
        is_active=current_user.is_active,
    )


@router.put("/profile")
def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.name = request.name
    db.commit()
    db.refresh(current_user)
    return _user_dict(current_user)


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(request.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ---------- Password reset ----------

@router.post("/request-password-reset")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        user.reset_token = str(uuid.uuid4())
        user.reset_token_expires = _utcnow_naive() + timedelta(hours=1)
        db.commit()
    return {"message": "If the email exists, a reset link was issued.", "reset_token": user.reset_token if user else None}


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < _utcnow_naive():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user.password_hash = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Password has been reset"}


# ---------- Email verification ----------

@router.post("/request-verification")
def request_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
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
