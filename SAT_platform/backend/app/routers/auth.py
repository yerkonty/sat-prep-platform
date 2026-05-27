from fastapi import APIRouter, Depends, HTTPException, Request, Response, Cookie, status
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from typing import Optional
from pydantic import BaseModel
import secrets
import uuid

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.database import get_db
from app.models import User, InviteLink, RefreshToken
from app.security import (
    get_password_hash,
    hash_opaque_token,
    password_needs_rehash,
    verify_password,
    create_access_token,
    create_refresh_token_value,
    token_matches,
)
from app.dependencies import get_current_user
from app.config import settings
from app.rate_limit import rate_limiter

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

PASSWORD_MIN_LENGTH = 12
ALLOWED_ORIGINS = {"http://localhost:3000", "http://127.0.0.1:3000"}


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _is_secure() -> bool:
    return settings.FRONTEND_URL.startswith("https")


def _origin_is_allowed(request: Request) -> bool:
    allowed_origins = set(ALLOWED_ORIGINS)
    if settings.FRONTEND_URL:
        allowed_origins.add(settings.FRONTEND_URL.rstrip("/"))

    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/") in allowed_origins

    referer = request.headers.get("referer")
    if not referer:
        return False

    return any(referer.startswith(origin + "/") or referer == origin for origin in allowed_origins)


def _enforce_origin(request: Request) -> None:
    if not _origin_is_allowed(request):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid request origin")


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    client = request.client.host if request.client else "unknown"
    return client or "unknown"


def _enforce_rate_limit(
    request: Request,
    action: str,
    *,
    limit: int,
    window_seconds: int,
    subject: Optional[str] = None,
) -> None:
    parts = [action, _client_ip(request)]
    if subject:
        parts.append(subject.strip().lower())
    key = ":".join(parts)
    allowed, retry_after = rate_limiter.allow(key, limit=limit, window_seconds=window_seconds)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many {action.replace('_', ' ')} attempts. Try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def _set_no_store_headers(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


def _validate_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {PASSWORD_MIN_LENGTH} characters long",
        )
    if not any(ch.islower() for ch in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must include at least one lowercase letter",
        )
    if not any(ch.isupper() for ch in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must include at least one uppercase letter",
        )
    if not any(ch.isdigit() for ch in password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must include at least one number",
        )


def _set_auth_cookies(response: Response, refresh_token: str) -> None:
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
    secure = _is_secure()
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite="lax",
        max_age=max_age,
    )


def _clear_auth_cookies(response: Response) -> None:
    for key in ("refresh_token",):
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
        token=hash_opaque_token(rt_value),
        expires_at=_utcnow_naive() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(rt)
    db.commit()

    _set_auth_cookies(response, rt_value)
    _set_no_store_headers(response)
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
def register(
    request: RegisterRequest,
    response: Response,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(http_request, "register", limit=6, window_seconds=900)
    _validate_password(request.password)
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
        invited_by_link_id=invite.id,
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
def login(
    request: LoginRequest,
    response: Response,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(http_request, "login", limit=8, window_seconds=300, subject=request.email)
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    user.last_active = _utcnow_naive()
    if password_needs_rehash(user.password_hash):
        user.password_hash = get_password_hash(request.password)
    db.commit()

    access_token = _issue_tokens(user, db, response)
    return AuthResponse(access_token=access_token, token_type="bearer", user=_user_dict(user))


# ---------- Google OAuth ----------

class GoogleAuthRequest(BaseModel):
    credential: str


@router.post("/google", response_model=AuthResponse)
def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    http_request: Request,
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(http_request, "google_login", limit=10, window_seconds=300)
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google OAuth not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            request.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    google_sub = idinfo["sub"]
    email = idinfo["email"]
    name = idinfo.get("name", "")

    user = db.query(User).filter(User.google_id == google_sub).first()

    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_sub
            if not user.email_verified:
                user.email_verified = True
            db.commit()
        else:
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                password_hash=get_password_hash(secrets.token_urlsafe(32)),
                name=name,
                subscription_plan="free",
                ai_messages_limit=3,
                role="student",
                google_id=google_sub,
                email_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

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
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    _enforce_origin(request)
    _enforce_rate_limit(request, "refresh", limit=20, window_seconds=300)
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token.in_([refresh_token, hash_opaque_token(refresh_token)]),
            RefreshToken.is_revoked == False,
        )
        .first()
    )
    if not rt or not token_matches(refresh_token, rt.token) or rt.expires_at < _utcnow_naive():
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
    request: Request,
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db),
):
    _enforce_origin(request)
    if refresh_token:
        rt = (
            db.query(RefreshToken)
            .filter(RefreshToken.token.in_([refresh_token, hash_opaque_token(refresh_token)]))
            .first()
        )
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
    _validate_password(request.new_password)
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(request.new_password)
    (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == current_user.id, RefreshToken.is_revoked == False)
        .update({RefreshToken.is_revoked: True}, synchronize_session=False)
    )
    db.commit()
    return {"message": "Password changed successfully"}


# ---------- Password reset ----------

@router.post("/request-password-reset")
def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    _enforce_rate_limit(request, "password_reset", limit=5, window_seconds=900, subject=payload.email)
    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        user.reset_token = hash_opaque_token(str(uuid.uuid4()))
        user.reset_token_expires = _utcnow_naive() + timedelta(hours=1)
        db.commit()
    return {"message": "If the email exists, a reset link was issued."}


@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    _validate_password(payload.new_password)
    token_hash = hash_opaque_token(payload.token)
    user = (
        db.query(User)
        .filter(User.reset_token.in_([payload.token, token_hash]))
        .first()
    )
    if not user or not user.reset_token_expires or user.reset_token_expires < _utcnow_naive():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    user.password_hash = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    (
        db.query(RefreshToken)
        .filter(RefreshToken.user_id == user.id, RefreshToken.is_revoked == False)
        .update({RefreshToken.is_revoked: True}, synchronize_session=False)
    )
    db.commit()
    return {"message": "Password has been reset"}


# ---------- Email verification ----------

@router.post("/request-verification")
def request_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.verification_token = hash_opaque_token(str(uuid.uuid4()))
    db.commit()
    return {"message": "Verification issued"}


@router.post("/verify-email")
def verify_email(payload: VerificationRequest, db: Session = Depends(get_db)):
    token_hash = hash_opaque_token(payload.token)
    user = (
        db.query(User)
        .filter(User.verification_token.in_([payload.token, token_hash]))
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    user.email_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified"}
