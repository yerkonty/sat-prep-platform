from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
import hashlib
import secrets
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _is_bcrypt_hash(hashed_password: str) -> bool:
    return hashed_password.startswith("$2")


def _legacy_hash_password(password: str, salt: Optional[str] = None) -> str:
    if salt is None:
        salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + pwd_hash.hex()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    if _is_bcrypt_hash(hashed_password):
        return pwd_context.verify(plain_password, hashed_password)
    salt = hashed_password[:32]
    check_hash = _legacy_hash_password(plain_password, salt)
    return secrets.compare_digest(check_hash, hashed_password)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Legacy SHA-256 + PBKDF2 password hash kept for verification/migration."""
    return _legacy_hash_password(password, salt)


def get_password_hash(password: str) -> str:
    """Hash a password for storing with bcrypt."""
    return pwd_context.hash(password)


def password_needs_rehash(hashed_password: str) -> bool:
    return not _is_bcrypt_hash(hashed_password) or pwd_context.needs_update(hashed_password)


def hash_opaque_token(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def token_matches(raw_token: str, stored_value: Optional[str]) -> bool:
    if not raw_token or not stored_value:
        return False
    if stored_value.startswith("sha256:"):
        return secrets.compare_digest(hash_opaque_token(raw_token), stored_value)
    return secrets.compare_digest(raw_token, stored_value)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = _utcnow_naive() + expires_delta
    else:
        expire = _utcnow_naive() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token_value() -> str:
    return secrets.token_urlsafe(64)


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
