from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sqla_func, case
from datetime import datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel
import uuid
import secrets

from app.database import get_db
from app.models import User, InviteLink, Progress
from app.dependencies import require_admin
from app.routers.progress import get_analytics_for_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------- Students ----------

@router.get("/students")
def list_students(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(
            User,
            sqla_func.count(Progress.id).label("total"),
            sqla_func.sum(case((Progress.is_correct == True, 1), else_=0)).label("correct"),
        )
        .outerjoin(Progress, Progress.user_id == User.id)
        .filter(User.role == "student")
        .group_by(User.id)
        .all()
    )

    invite_map = {}
    invite_ids = {s.invited_by_link_id for s, _, _ in rows if s.invited_by_link_id}
    if invite_ids:
        invites = db.query(InviteLink).filter(InviteLink.id.in_(invite_ids)).all()
        invite_map = {inv.id: inv for inv in invites}

    return [
        {
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "is_active": s.is_active,
            "questions_answered": total,
            "accuracy": round(int(correct or 0) / total * 100, 1) if total else 0.0,
            "last_active": s.last_active.isoformat() if s.last_active else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "invite_token_preview": (
                invite_map[s.invited_by_link_id].token[:12] + "..."
                if s.invited_by_link_id and s.invited_by_link_id in invite_map
                else None
            ),
        }
        for s, total, correct in rows
    ]


@router.get("/students/{student_id}")
def get_student_detail(
    student_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    analytics = get_analytics_for_user(student_id, db)

    invite_info = None
    if student.invited_by_link_id:
        inv = db.query(InviteLink).filter(InviteLink.id == student.invited_by_link_id).first()
        if inv:
            invite_info = {
                "token_preview": inv.token[:12] + "...",
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }

    return {
        "id": student.id,
        "name": student.name,
        "email": student.email,
        "is_active": student.is_active,
        "last_active": student.last_active.isoformat() if student.last_active else None,
        "created_at": student.created_at.isoformat() if student.created_at else None,
        "invite": invite_info,
        "analytics": analytics.model_dump(),
    }


@router.put("/students/{student_id}/deactivate")
def toggle_student_active(
    student_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    student.is_active = not student.is_active
    db.commit()
    return {"id": student.id, "is_active": student.is_active}


# ---------- Invites ----------

class CreateInviteRequest(BaseModel):
    max_uses: Optional[int] = None
    expires_in_days: Optional[int] = None


@router.post("/invites")
def create_invite(
    request: CreateInviteRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    invite = InviteLink(
        id=str(uuid.uuid4()),
        token=secrets.token_urlsafe(32),
        created_by=admin.id,
        max_uses=request.max_uses,
        expires_at=_utcnow_naive() + timedelta(days=request.expires_in_days) if request.expires_in_days else None,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    return {
        "id": invite.id,
        "token": invite.token,
        "max_uses": invite.max_uses,
        "uses_count": invite.uses_count,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "is_active": invite.is_active,
        "created_at": invite.created_at.isoformat() if invite.created_at else None,
    }


@router.get("/invites")
def list_invites(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    invites = db.query(InviteLink).order_by(InviteLink.created_at.desc()).all()
    return [
        {
            "id": inv.id,
            "token": inv.token,
            "max_uses": inv.max_uses,
            "uses_count": inv.uses_count,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            "is_active": inv.is_active,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
        }
        for inv in invites
    ]


@router.delete("/invites/{invite_id}")
def revoke_invite(
    invite_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    invite = db.query(InviteLink).filter(InviteLink.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    invite.is_active = False
    db.commit()
    return {"id": invite.id, "is_active": False}
