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
        return

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
