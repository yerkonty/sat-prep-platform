from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


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

    if "users" in tables:
        u_cols = {col["name"] for col in inspector.get_columns("users")}
        if "email_verified" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0")
        if "verification_token" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN verification_token VARCHAR")
        if "reset_token" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN reset_token VARCHAR")
        if "reset_token_expires" not in u_cols:
            statements.append("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME")

    if "flashcard_decks" in tables:
        d_cols = {col["name"] for col in inspector.get_columns("flashcard_decks")}
        if "is_shared" not in d_cols:
            statements.append("ALTER TABLE flashcard_decks ADD COLUMN is_shared BOOLEAN DEFAULT 0")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
