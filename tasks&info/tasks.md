# Phase: Launching Questions (P0 - Highest Priority)

- [ ] Add Math question dataset to DB (current live solvable set is Reading & Writing: 947).
- [ ] Run authenticated browser smoke test for /practice and /practice/session launch flow before release.

---

# Phase: Security Backbone (P1 - Start after P0 is complete)

Plan file: `/home/yerkonty/.claude/plans/sorry-continue-concurrent-peacock.md`

## What's being built
Invite-only registration, role system (admin/student), refresh tokens, frontend route guards, admin panel, and class leaderboard. Single-academy model — you are the admin/teacher.

## Tasks (do in order)

- [ ] **Step 1 — Models + Migration**: Add `role`, `is_active`, `last_active` to User; add `InviteLink` and `RefreshToken` models; add idempotent ALTER TABLE statements to `migrations.py`
- [ ] **Step 2 — Dependencies**: Add `is_active` check to `get_current_user`; add `require_admin` dependency in `dependencies.py`
- [ ] **Step 3 — Auth router**: Gate `register` behind invite token; add `refresh`, `logout`, `join/{token}` endpoints; embed role in JWT; set 3 cookies (refresh_token httpOnly, logged_in, user_role)
- [ ] **Step 4 — Seed admin**: Create `seed_admin.py` one-time script; run it to create teacher account
- [ ] **Step 5 — Admin router**: Create `routers/admin.py` (student list, invite CRUD, deactivate); extract `get_analytics_for_user` helper from `progress.py`; register in `main.py`
- [ ] **Step 6 — Leaderboard router**: Create `routers/leaderboard.py`; register in `main.py`
- [ ] **Step 7 — Frontend auth layer**: Update `AuthContext.tsx` (role field, invite token in register, async logout, silent refresh); update `api.ts` (withCredentials, refresh-retry 401 handler)
- [ ] **Step 8 — Route guards**: Create `middleware.ts` (protect all pages, admin-only /admin)
- [ ] **Step 9 — New frontend pages**: Update `register/page.tsx`; create `join/[token]/page.tsx`, `admin/page.tsx`, `leaderboard/page.tsx`; update `Navbar.tsx` (Leaderboard + Admin links, remove open Sign up)
