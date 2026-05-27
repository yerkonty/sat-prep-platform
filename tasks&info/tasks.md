# Phase: Launching Questions (P0 - Highest Priority)

- [ ] Add Math question dataset to DB (current live solvable set is Reading & Writing: 947).
- [ ] Run authenticated browser smoke test for /practice and /practice/session launch flow before release.

---

# Phase: Security Backbone (P1) — COMPLETE

All 9 steps shipped in commit `75895e8`. Invite-only registration, role system (admin/student), refresh tokens, frontend route guards, admin panel, and class leaderboard are live.

---

# Phase: Production Hardening & Polish (P2 - Current)

- [ ] Run a Codex self-review on the Security Backbone commit — validate no regressions, dead code, or missed edge cases across all 20 changed files.
- [ ] Stripe webhook integration — finish wiring subscription events so `subscription_plan` updates automatically.
- [ ] Smoke-test the full invite → register → practice → answer flow end-to-end in a browser (authenticated).
- [ ] Deploy Security Backbone changes to production (Vercel + Railway + Supabase).

---

# Phase: Content & Growth (P3 - After P2)

- [ ] Continue parsing and importing Math question PDFs (expand beyond current set).
- [ ] Add more RW question sources to increase coverage.
- [ ] Practice test scoring and review screen improvements.
- [ ] AI tutor improvements — better context from question history, multi-turn follow-ups.

---

# Phase: Competitive Edge (P4 - Future)

*Based on competitor analysis (Makon AI, OnePrep, LearnQ, Khan Academy, Bluebook) — May 2026.*

### Critical Bug (fix before anything else here)
- [ ] Fix Stripe success URL — `subscriptions.py` line 68 hardcodes a dead Render URL (`sat-prep-platform-1.onrender.com`). Replace with `settings.BACKEND_URL`. Every paid checkout silently fails.

### Post-Answer AI Context Loop
- [ ] Add "Ask AI" button in practice session that appears after answer submission.
- [ ] Open a modal (not page navigation) pre-loaded with question content, student's answer, correct answer, and explanation as context.
- [ ] Wire the existing `context` field in `ChatRequest` so the AI tutor responds with question-aware explanations.
- [ ] Update `SYSTEM_PROMPT` in `ai_tutor.py` to handle question-context mode — explain why correct answer is right, why student's was wrong, offer follow-up question.

### Onboarding Flow
- [ ] Add `target_score`, `test_date`, `daily_goal_questions`, `onboarding_completed` columns to `User` model + startup migration.
- [ ] Add `PUT /api/auth/onboarding` endpoint.
- [ ] Build 3-step onboarding modal shown after first login: target score → test date → daily goal.
- [ ] Dashboard: daily goal progress bar, days-until-test countdown, "continue where you left off" CTA.

### Projected SAT Score
- [ ] Compute projected 400–1600 score from per-section accuracy weighted by difficulty in `get_analytics_for_user()`.
- [ ] Only show when student has answered ≥20 questions.
- [ ] Add `<ProjectedScoreCard>` widget on dashboard with score + delta to target.
- [ ] Optional: trend line ("was 1180 two weeks ago, now 1240").

### Other Competitive Gaps
- [ ] Raise AI tutor daily limits (5 free / 50 paid is far below competitors' "always-on").
- [ ] Mobile optimization for practice session (split-pane, Desmos break on small screens).
- [ ] Question Rush / rapid-fire drill mode (inspired by OnePrep).
- [ ] Adaptive difficulty — route to harder/easier questions based on recent accuracy per skill.
- [ ] Study plan scheduler — auto-schedule daily question queues prioritizing weak skills (depends on onboarding being live).
