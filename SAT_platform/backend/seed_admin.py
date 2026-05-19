#!/usr/bin/env python3
"""
One-time script to create or upgrade a user to admin role.

Usage:
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret ADMIN_NAME="Your Name" python seed_admin.py
"""

import os
import sys
import uuid

from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal
from app.models import User
from app.security import get_password_hash

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
ADMIN_NAME = os.environ.get("ADMIN_NAME", "Admin")


def main() -> None:
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        print("ERROR: set ADMIN_EMAIL and ADMIN_PASSWORD env vars")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if user:
            user.role = "admin"
            print(f"Upgraded existing user {ADMIN_EMAIL} to admin")
        else:
            user = User(
                id=str(uuid.uuid4()),
                email=ADMIN_EMAIL,
                password_hash=get_password_hash(ADMIN_PASSWORD),
                name=ADMIN_NAME,
                subscription_plan="free",
                ai_messages_limit=999,
                role="admin",
            )
            db.add(user)
            print(f"Created admin user {ADMIN_EMAIL}")

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
