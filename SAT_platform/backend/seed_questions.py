"""Seed the database with OpenSAT questions using the public API."""
from app.database import Base, engine
from app.migrations import run_startup_migrations
from import_opensat import import_opensat, OPEN_SAT_URL


def seed() -> None:
    run_startup_migrations(engine)
    Base.metadata.create_all(bind=engine)
    results = import_opensat(OPEN_SAT_URL)
    print(f"Seed complete: {results}")


if __name__ == "__main__":
    seed()
