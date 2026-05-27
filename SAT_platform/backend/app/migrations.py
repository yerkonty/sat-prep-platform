from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from app.security import hash_opaque_token


def run_startup_migrations(engine: Engine) -> None:
    """Apply simple, idempotent migrations for small schema tweaks."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    statements = []

    if "questions" in tables:
        q_cols = {col["name"] for col in inspector.get_columns("questions")}
        if "section" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN section VARCHAR")
        if "domain" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN domain VARCHAR")
        if "external_id" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN external_id VARCHAR")
        if "skill" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN skill VARCHAR")
        if "subcategory" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN subcategory VARCHAR")
        if "passage_type" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN passage_type VARCHAR")
        if "image" not in q_cols:
            statements.append("ALTER TABLE questions ADD COLUMN image TEXT")

    if "users" in tables:
        u_cols = {col["name"] for col in inspector.get_columns("users")}
        if "email_verified" not in u_cols:
            statements.append(
                "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0"
            )
        if "verification_token" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN verification_token VARCHAR")
        if "reset_token" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN reset_token VARCHAR")
        if "reset_token_expires" not in u_cols:
            statements.append(
                "ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"
            )
        if "role" not in u_cols:
            statements.append(
                "ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'student'"
            )
        if "is_active" not in u_cols:
            statements.append(
                "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1"
            )
        if "last_active" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN last_active DATETIME")
        if "invited_by_link_id" not in u_cols:
            statements.append(
                "ALTER TABLE users ADD COLUMN invited_by_link_id VARCHAR REFERENCES invite_links(id)"
            )
        if "google_id" not in u_cols:
            statements.append(
                "ALTER TABLE users ADD COLUMN google_id VARCHAR"
            )

    if "flashcard_decks" in tables:
        d_cols = {col["name"] for col in inspector.get_columns("flashcard_decks")}
        if "is_shared" not in d_cols:
            statements.append(
                "ALTER TABLE flashcard_decks ADD COLUMN is_shared BOOLEAN DEFAULT 0"
            )

    if "flashcards" in tables:
        c_cols = {col["name"] for col in inspector.get_columns("flashcards")}
        if "interval_days" not in c_cols:
            statements.append(
                "ALTER TABLE flashcards ADD COLUMN interval_days INTEGER DEFAULT 0"
            )

    if "exam_attempts" in tables:
        ea_cols = {col["name"] for col in inspector.get_columns("exam_attempts")}
        if "status" not in ea_cols:
            statements.append(
                "ALTER TABLE exam_attempts ADD COLUMN status VARCHAR DEFAULT 'in_progress'"
            )
        if "started_at" not in ea_cols:
            statements.append("ALTER TABLE exam_attempts ADD COLUMN started_at TIMESTAMP")

    if not statements:
        pass

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        if "refresh_tokens" in tables:
            rows = conn.execute(text("SELECT id, token FROM refresh_tokens")).fetchall()
            for row in rows:
                if row.token and not row.token.startswith("sha256:"):
                    conn.execute(
                        text("UPDATE refresh_tokens SET token = :token WHERE id = :id"),
                        {"id": row.id, "token": hash_opaque_token(row.token)},
                    )
        if "users" in tables:
            rows = conn.execute(
                text("SELECT id, reset_token, verification_token FROM users")
            ).fetchall()
            for row in rows:
                if row.reset_token and not row.reset_token.startswith("sha256:"):
                    conn.execute(
                        text("UPDATE users SET reset_token = :token WHERE id = :id"),
                        {"id": row.id, "token": hash_opaque_token(row.reset_token)},
                    )
                if row.verification_token and not row.verification_token.startswith("sha256:"):
                    conn.execute(
                        text("UPDATE users SET verification_token = :token WHERE id = :id"),
                        {"id": row.id, "token": hash_opaque_token(row.verification_token)},
                    )
