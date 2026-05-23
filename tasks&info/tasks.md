# Phase: Launching Questions (P0 - Highest Priority)

- [ ] Add Math question dataset to DB (current live solvable set is Reading & Writing: 947).
- [ ] Run authenticated browser smoke test for /practice and /practice/session launch flow before release.

---

# Phase: Security Backbone (P1) — COMPLETE

All 9 steps shipped in commit `75895e8`. Invite-only registration, role system (admin/student), refresh tokens, frontend route guards, admin panel, and class leaderboard are live.

---

# Phase: Production Hardening & Polish (P2 - Current)

- [ ] Run `/self-review` on the Security Backbone commit — validate no regressions, dead code, or missed edge cases across all 20 changed files.
- [ ] Stripe webhook integration — finish wiring subscription events so `subscription_plan` updates automatically.
- [ ] Smoke-test the full invite → register → practice → answer flow end-to-end in a browser (authenticated).
- [ ] Deploy Security Backbone changes to production (Vercel + Railway + Supabase).

---

# Phase: Content & Growth (P3 - After P2)

- [ ] Continue parsing and importing Math question PDFs (expand beyond current set).
- [ ] Add more RW question sources to increase coverage.
- [ ] Practice test scoring and review screen improvements.
- [ ] AI tutor improvements — better context from question history, multi-turn follow-ups.
