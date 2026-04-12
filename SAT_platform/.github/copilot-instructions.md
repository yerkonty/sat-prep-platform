# Project Guidelines

## Task Tracking (Critical)
- Main task file is mandatory: C:\Users\Asus\OneDrive\Desktop\acing\SAT_website\tasks&info\tasks.md
- Repository-relative pointer: [tasks&info/tasks.md](../../tasks&info/tasks.md)
- Track only pending tasks in this file.
- When a task is completed, remove it from tasks.md.
- When all tasks in a phase are done, delete that full phase block.
- After deleting a completed phase, start the next phase cleanly.
- For every new user prompt, perform smart lookup in tasks.md before planning changes.
- If the user asks for an urgent adjustment outside current task logic, do the user request first, then reconcile tasks.md.

## Build and Verification
- Backend run: cd SAT_platform/backend ; uvicorn app.main:app --reload
- Frontend run: cd SAT_platform/frontend ; npm run dev
- Before finishing code changes: cd SAT_platform/frontend ; npm run build
- No formal automated tests yet: use build plus API smoke checks.

## Core Architecture Anchors
- Backend entry and router wiring: [backend/app/main.py](../backend/app/main.py)
- Question APIs and filters: [backend/app/routers/questions.py](../backend/app/routers/questions.py)
- Progress analytics: [backend/app/routers/progress.py](../backend/app/routers/progress.py)
- Frontend API client and auth token behavior: [frontend/lib/api.ts](../frontend/lib/api.ts)
- Practice bank and session pages:
  - [frontend/app/practice/page.tsx](../frontend/app/practice/page.tsx)
  - [frontend/app/practice/session/page.tsx](../frontend/app/practice/session/page.tsx)

## Non-Negotiable Conventions
- Do not hardcode question counts. Use API data and show 0 when data is missing.
- Keep practice filtering URL-driven (module, domain, skill) and aligned with backend filters.
- Preserve existing auth behavior: token from localStorage and redirect to /login on 401.
- Respect current design tokens in [frontend/app/globals.css](../frontend/app/globals.css).

## References
- Project overview: [README.md](../README.md)
- Frontend notes: [frontend/README.md](../frontend/README.md)
