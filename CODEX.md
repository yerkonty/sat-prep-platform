# CODEX.md

This file provides guidance to Codex when working with code in this repository.

## Project Layout

```
SAT_platform/
├── backend/          # FastAPI Python backend
│   ├── app/          # Application package
│   └── *.py          # Standalone data-pipeline scripts
└── frontend/         # Next.js 16 (React 19) frontend
    ├── app/          # App Router pages
    ├── components/   # Shared UI components
    ├── context/      # React context providers
    └── lib/          # Axios client + KaTeX math renderer
```

All development work lives under `SAT_platform/`. `tasks&info/tasks.md` is the active task list.

## Working Agreement

- Treat this file as the active replacement for `.claude/CLAUDE.md`.
- The `.claude/` directory may remain in the repo for historical reference, but Codex should follow `CODEX.md` first.
- Prefer reading the current code over older agent notes if they disagree.

## Running the Project

Backend, from `SAT_platform/backend/`:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend, from `SAT_platform/frontend/`:

```bash
npm install
npm run dev
```

Frontend lint:

```bash
cd SAT_platform/frontend && npm run lint
```

## Environment Variables

Backend, `SAT_platform/backend/.env`:

```env
DATABASE_URL=sqlite:///./sat_platform.db
SECRET_KEY=your-secret-key
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_CLIENT_ID=your-google-client-id
FRONTEND_URL=http://localhost:3000
```

Frontend, `SAT_platform/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Architecture Notes

### Backend

- Entry point: `SAT_platform/backend/app/main.py`
- Core models: `SAT_platform/backend/app/models.py`
- Routers: `SAT_platform/backend/app/routers/`
- Config: `SAT_platform/backend/app/config.py`
- Startup migrations: `SAT_platform/backend/app/migrations.py`

### Frontend

- App Router pages live in `SAT_platform/frontend/app/`
- Shared UI lives in `SAT_platform/frontend/components/`
- Auth state lives in `SAT_platform/frontend/context/AuthContext.tsx`
- API client lives in `SAT_platform/frontend/lib/api.ts`
- Math rendering lives in `SAT_platform/frontend/lib/renderMath.ts`

### Auth Flow

- Access token is stored in `localStorage`
- Refresh token is stored in HTTP-only cookies
- `AuthContext` loads profile state on startup
- Axios retries once through `/api/auth/refresh` on `401` or `403`

### Database Migrations

There is no Alembic workflow in active use for app schema changes.

When adding a column:
1. Update the SQLAlchemy model in `app/models.py`
2. Add an idempotent migration in `app/migrations.py`
3. Verify startup migrations are safe on existing databases

### Question Data Pipeline

Reading & Writing:
- `pdf_parser.py` parses text-based PDFs with `pdfplumber`
- `import_college_board.py` imports parsed JSON

Math:
- `pdf_to_json_claude.py` extracts math questions with Claude Vision
- `import_json_questions.py` imports MC questions
- `pdf_to_json_claude_spr.py` and `import_spr_questions.py` handle SPR questions
- `recrop_images.py` should be used for crop tuning before spending more API tokens

## Codex Replacements For Old Claude Workflows

Instead of old slash commands, ask Codex directly:

- "Review my changes" replaces `/self-review`
- "Smoke test the practice flow" replaces `/smoke-test`
- "Add a migration for ..." replaces `/migrate`
- "What should we build next?" replaces `/sprint`
- "Act as the question pipeline engineer" replaces the old specialized parsing agent flow

## Codex Operating Modes For This Repo

### Backend Specialist

Use for:
- FastAPI routes
- SQLAlchemy models
- auth/security
- subscriptions/Stripe
- migrations

Important files:
- `SAT_platform/backend/app/main.py`
- `SAT_platform/backend/app/models.py`
- `SAT_platform/backend/app/routers/`
- `SAT_platform/backend/app/migrations.py`

### Frontend Specialist

Use for:
- Next.js pages
- React state and hooks
- practice session UI
- auth UX
- TypeScript/lint fixes

Important files:
- `SAT_platform/frontend/app/`
- `SAT_platform/frontend/components/`
- `SAT_platform/frontend/context/AuthContext.tsx`
- `SAT_platform/frontend/lib/api.ts`

### Question Pipeline Specialist

Use for:
- PDF parsing
- import scripts
- skill/domain mapping
- crop debugging
- question coverage analysis

Important files:
- `SAT_platform/backend/pdf_parser.py`
- `SAT_platform/backend/pdf_to_json_claude.py`
- `SAT_platform/backend/import_json_questions.py`
- `SAT_platform/backend/import_spr_questions.py`
- `SAT_platform/backend/recrop_images.py`

### Product / Research Partner

Use for:
- sprint planning
- feature prioritization
- competitive gap analysis
- user-flow audits

Source of truth:
- `tasks&info/tasks.md`
- `project.md`
- current frontend/backend routes and models

## Design Guidance

Use `SAT_platform/frontend/DESIGN.md` as the active design standard. It contains the platform's visual, motion, density, and interaction rules.

## Practical Rules

- Prefer current code over older docs if they conflict
- Keep changes inside existing app patterns unless there is a strong reason to improve them
- Run lint after frontend edits
- Be careful with startup migrations and existing production data
- For math parsing, avoid re-running paid vision extraction when `recrop_images.py` can solve the issue
