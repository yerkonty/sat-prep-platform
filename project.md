# MaxSAT — SAT Prep Platform

A full-stack web application for Digital SAT preparation: practice questions, full-length timed practice tests, AI tutoring, flashcards, and detailed progress analytics.

**Live:**
- Frontend: https://satplatform-three.vercel.app
- Backend API: https://sat-prep-platform-1.onrender.com
- Database: Supabase PostgreSQL (Tokyo region, ap-northeast-1)

---

## 1. The Problem & The Solution

### Problem
The College Board redesigned the SAT in 2024 into the Digital SAT — students now take it on a tablet using an app called **Bluebook**. Existing prep materials are mostly paper-based or expensive ($200–$500 for top services like Khan Academy partners and Princeton Review). Students who cannot afford private tutors are at a real disadvantage.

### Solution
MaxSAT delivers a free-to-start, AI-powered prep experience that mirrors the Bluebook test environment:

- A bank of **2,409 real-style questions** (1,657 Reading & Writing + 752 Math) with detailed explanations.
- A **timed full-length practice test** that copies the look-and-feel of Bluebook (countdown timer, flag-for-review, question navigator, split-pane reading layout, scaled 200–800 scoring per section).
- An **AI tutor** that answers conceptual questions and walks students through problems.
- **Spaced-repetition flashcards** for vocabulary and formula memorization.
- **Progress analytics** that identify weak skills so students focus on what matters.

---

## 2. How We Built It (Step by Step)

We followed a layered build order — backend first, frontend second, deployment last.

1. **Database design.** We modeled the system around eight entities: User, Question, Progress, FlashcardDeck, Flashcard, ExamAttempt, Lesson, Subscription. Each has clear relationships (e.g., a User has many Progress records, each Progress points at one Question).

2. **Backend API.** Built REST endpoints for every feature: register/login, fetch questions, submit answers, get analytics, chat with AI, study flashcards, take a practice test, upgrade subscription. The API enforces authentication on every protected route via JSON Web Tokens (JWT).

3. **Question content pipeline.** Real SAT questions live inside official PDFs. We wrote two specialized parsers:
   - For **Reading & Writing**, we used a Python library called `pdfplumber` to extract text, identify the passage, the four answer choices, and the correct answer, and infer the skill area from headers.
   - For **Math**, the formulas and figures don't survive plain text extraction. We rendered each PDF page as an image and sent it to **Claude (Anthropic's vision model)** with a prompt that asks for the question in structured JSON with LaTeX math notation. This let us capture things like exponents, fractions, and equations cleanly.

4. **Frontend UI.** Built each page in Next.js using React components, styled with Tailwind CSS. Reused common patterns (the practice session UI is reused inside the practice test) so we ship features faster and avoid duplicate code.

5. **Authentication flow.** When a user logs in, the backend signs a JWT and returns it. The frontend stores it in `localStorage`. Every subsequent API request automatically attaches the token via an Axios interceptor. If the token expires, the user is bounced to `/login`.

6. **AI Tutor wiring.** The frontend posts the user's message + chat history to `POST /api/ai/chat`. The backend forwards it to **Groq's API** (which runs Meta's Llama 3.3 70B model) with a system prompt instructing it to act as an SAT tutor. Each user has a daily message quota (3 for free, 50 for Basic).

7. **Practice test.** When a student starts a test, the backend selects 27 RW + 22 Math questions at random (filtered to text-only — no images, since image quality from PDFs varies). The frontend runs a countdown timer per module, lets students flag and navigate freely, then submits all answers at once. The backend computes the scaled score (200–800 per section) and stores the attempt.

8. **Payments.** We integrated **Stripe Checkout** for the Basic plan. The frontend asks the backend to create a checkout session; Stripe handles all card data (we never see it); on success Stripe redirects back and we upgrade the user's plan.

9. **Deployment.** Frontend went to **Vercel**, backend to **Render**, database to **Supabase**. All three offer generous free tiers and integrate well with each other.

---

## 3. Languages and Frameworks

| Layer | Technology | What it is |
|---|---|---|
| Frontend language | **TypeScript** | JavaScript with type checking — catches bugs before runtime |
| Frontend framework | **Next.js 16 (React 19)** | The leading React framework; handles routing, server-side rendering, and deployment |
| Frontend styling | **Tailwind CSS** | A utility-first styling system — write styles inline as classes (`bg-blue-500 p-4`) |
| Math rendering | **KaTeX** | Renders mathematical equations in the browser (faster than the alternative MathJax) |
| Backend language | **Python 3.11** | Best ecosystem for AI, data processing, and rapid backend development |
| Backend framework | **FastAPI** | Modern Python web framework with automatic API documentation and type safety |
| ORM | **SQLAlchemy** | Industry-standard library for talking to databases without writing raw SQL |
| Database | **PostgreSQL** (via Supabase) | Reliable, open-source relational database used by Instagram, Reddit, etc. |
| AI | **Groq API** running **Llama 3.3 70B** | Free tier, very fast inference, high-quality responses |
| Vision AI | **Claude Sonnet 4.6** (Anthropic) | Used to read math questions from PDFs into structured data |
| Payments | **Stripe** | Industry standard; handles PCI compliance for us so we never touch card data |
| Auth | **JWT + bcrypt** | Industry-standard token format; bcrypt hashes passwords with built-in salting |

---

## 4. Why We Chose These Tools

Every choice here is defensible. Here's the reasoning:

### Why Next.js (not plain React, Vue, or Angular)?
Next.js is the most-used React framework in production. It gives us **server-side rendering** (better SEO and faster first page load), **file-based routing** (a file at `app/practice/page.tsx` automatically becomes the URL `/practice`), and **first-class deployment on Vercel** (the company that makes it). For a project that needs to feel polished quickly, Next.js was the obvious choice.

### Why FastAPI (not Django, Flask, or Node.js/Express)?
- **Type safety**: FastAPI uses Pydantic to validate request/response bodies automatically. If a frontend sends bad data, the API rejects it with a clear error before our code runs.
- **Auto documentation**: It generates an interactive API documentation page at `/docs` — useful for testing and for showing the dean.
- **Speed**: One of the fastest Python web frameworks; comparable to Node.js for I/O-heavy work.
- **AI ecosystem**: Python has the best AI/ML libraries, so when integrating Groq, OpenAI, Anthropic, the code is shorter and cleaner than in Node.js.

### Why PostgreSQL (not MySQL or MongoDB)?
PostgreSQL is more standards-compliant than MySQL and supports JSON columns natively (we use `breakdown JSON` on `ExamAttempt` to store rich exam state). Unlike MongoDB, it gives us **relational integrity** — a `Progress` row cannot point at a `User` that doesn't exist. For an app where data consistency matters (you don't want a student's score to disappear), relational databases are the safer pick.

### Why Supabase (not raw Postgres on a server)?
Supabase is a **managed Postgres** provider — they handle backups, replication, security patches, monitoring. Their free tier gives us 500 MB of storage and unlimited API calls, which is enough for thousands of users. Setting up our own Postgres server would have taken days; Supabase took 10 minutes.

### Why Render (not AWS, GCP, or Heroku)?
- **Heroku** killed its free tier in 2022.
- **AWS / GCP** require deep DevOps knowledge — VPCs, IAM roles, load balancers — overkill for a launch.
- **Render** offers a one-click Python deploy from GitHub with HTTPS, environment variables, and free tier hosting. It is essentially "Heroku, but free."

We originally tried **Railway** but its UI was hard to navigate and its build kept failing on the monorepo structure. Switching to Render took an hour and worked first try.

### Why Vercel (not also Render, or Netlify)?
Vercel is built by the same team that makes Next.js. Deployment happens with one command (`vercel --prod`) and includes automatic HTTPS, a global CDN (so users in Europe get the page from European servers), and atomic deploys (if a build fails, the old version stays live). Netlify is comparable but Vercel has tighter Next.js integration.

### Why Groq for the AI Tutor (not OpenAI or Anthropic directly)?
- **OpenAI's GPT-4o** costs ~$2.50 per million tokens. Affordable for a paying user, expensive for free users.
- **Groq runs open-source models** (Llama 3.3 70B from Meta) on custom inference hardware. Quality is comparable to GPT-4o-mini for tutoring tasks. **Free tier is generous** (~14,400 requests per day per IP). For a launch, this lets us offer an AI tutor without burning money.

### Why Claude for the math question pipeline (not GPT-4 or Gemini)?
Claude's vision capability for **structured JSON extraction** is reliable. We needed each math question to come back as `{question: "...", options: [...], answer: "B", explanation: "..."}` with LaTeX preserved. Claude consistently produced clean JSON that didn't need post-processing. GPT-4 worked too but Claude was slightly better at the LaTeX formatting.

### Why Stripe (not PayPal, Square, or Lemon Squeezy)?
Stripe handles **PCI compliance** — the security regulations for handling credit card numbers. We never touch the card. Stripe's API is the cleanest in the industry, and it has a free **test mode** which lets us demo paid plans with a fake test card (`4242 4242 4242 4242`) without real money changing hands.

### Why JWT for authentication (not sessions or OAuth)?
JWT is **stateless**: the server doesn't have to remember who's logged in — the token itself is signed proof. This means we can scale across multiple servers later without sticky sessions. It's also the industry standard for SPAs (single-page apps) like ours.

---

## 5. System Architecture

```
       Browser (Next.js / React)
                |
    [1] HTTP request with JWT in header
                |
                v
       Backend API (FastAPI on Render)
        |               |              |
        |               |              |
[2] Auth check     [3] Business     [4] AI calls
   (verify JWT)      logic           (Groq, Anthropic)
        |               |
        v               v
  PostgreSQL (Supabase) — stores users, questions, progress, exams
```

**Step by step:**
1. The browser loads the Next.js app from Vercel's CDN.
2. The user logs in. The browser receives a JWT and stores it in `localStorage`.
3. Every API call includes the JWT in the `Authorization` header.
4. The backend verifies the JWT, identifies the user, runs business logic, queries the database, and returns JSON.
5. AI requests are forwarded to Groq (chat) or Anthropic (PDF parsing during data collection).

Everything is **stateless** on the API side — we can run multiple backend instances behind a load balancer without changes.

---

## 6. Features Implemented

| Feature | Status | What's Real |
|---|---|---|
| Email/password registration & login | ✓ | Real database, bcrypt password hashing, JWT session |
| Email verification & password reset | ✓ | Token-based flows |
| Practice question bank (2,409 questions) | ✓ | Real DB; filterable by section / domain / skill / difficulty |
| Practice session UI | ✓ | Split-pane for RW, full-width for Math, KaTeX math, draggable Desmos calculator |
| Practice test (Bluebook-style) | ✓ | 49 timed questions (27 RW + 22 Math), countdown timer, flag-for-review, question navigator, scaled 200–800 scoring |
| AI Tutor | ✓ | Groq Llama 3.3 70B, daily quota by plan |
| Flashcards | ✓ | CRUD + spaced-repetition scheduling (intervals double on each correct review) |
| Progress analytics | ✓ | Per-section, per-domain, per-skill accuracy; weak-skill identification |
| Subscription / Stripe checkout | ✓ | Real Stripe checkout in test mode (`4242 4242 4242 4242` card) |
| Profile settings | ✓ | Update name, change password |

---

## 7. Data Pipeline — Where The Questions Come From

This is one of the most defensible technical achievements in the project.

### Reading & Writing (~1,657 questions)
1. Source: **College Board's official practice PDFs** (free, publicly distributed).
2. Tool: `pdfplumber` (Python library) extracts text from each page.
3. We wrote heuristics that look at headers like "Domain: Information and Ideas" → assign domain to that question. We classify passages as `single` or `dual`.
4. We extract the four answer options (A/B/C/D) and the correct answer key.
5. The result is uploaded to PostgreSQL via SQLAlchemy.

### Math (~752 questions)
1. Source: same PDFs.
2. Plain text extraction destroys equations. So instead, each page is rendered as a PNG image.
3. The PNG is sent to **Claude Sonnet 4.6** (vision model) with a strict JSON schema in the prompt: `{question_text, options, correct_answer, explanation, skill, difficulty}`. LaTeX is preserved using `\\frac{1}{2}` etc.
4. Claude's response is parsed and inserted into the database.

### Why this matters for the defense
This is **original engineering work**, not just an AI-coded copy of an existing app. Building this pipeline solved a real problem: how to convert hundreds of pages of PDFs into a queryable database of math questions with correct equation rendering.

---

## 8. The AI Layer — Where AI Is Used in Production

Three distinct uses:

1. **AI Tutor (live, user-facing).** The student types a question in the AI Tutor page. The frontend POSTs to `/api/ai/chat`. The backend forwards to Groq's chat completions API with our SAT-tutor system prompt, then returns the response. Daily quotas: 3 messages/day on Free, 50 on Basic.

2. **Math question extraction (offline pipeline).** As described above — Claude vision converts PDFs to structured JSON.

3. **Code assistance during development.** We used Claude Code (the CLI tool from Anthropic) extensively to scaffold features faster. Every architectural decision and the *understanding* of the system is the developer's, but the implementation was significantly accelerated by AI pair-programming.

---

## 9. Major Obstacles & How We Overcame Them

These are the real production challenges we hit. Each one is a question the dean could ask.

### Obstacle 1: Railway deployment kept failing
**Problem:** Railway (initial choice for backend hosting) couldn't find our backend code because the project lives in a monorepo (`SAT_platform/backend/...`). Builds timed out and crashed without clear logs.
**Fix:** Switched to Render. Render handles monorepos natively (set "Root Directory" → `SAT_platform/backend` in the dashboard). Deployment worked first try.
**Lesson:** Always evaluate hosting platforms based on monorepo support if your project is structured this way.

### Obstacle 2: pydantic-core wouldn't compile on Render's default Python
**Problem:** Render defaulted to Python 3.14 (released late 2025). Our dependency `pydantic-core` (the validation library) had no pre-built wheel for 3.14, so Render tried to compile it from Rust source — which failed because the compiler couldn't write to the read-only cache.
**Fix:** Pinned Python to **3.11.9** by creating a `.python-version` file at the project root and setting `PYTHON_VERSION=3.11.9` as an environment variable. Render now uses Python 3.11.9, which has all the pre-built binary wheels we need.
**Lesson:** When deploying Python services, always pin the Python version explicitly. Newer is not always better.

### Obstacle 3: Supabase + Render IPv6 incompatibility
**Problem:** Supabase's direct database hostname (`db.xxx.supabase.co`) only resolves to an IPv6 address. Render's free tier only supports outbound IPv4. The backend couldn't connect to the database — `network unreachable` errors.
**Fix:** Switched to Supabase's **session pooler** (`aws-0-region.pooler.supabase.com:5432`), which supports IPv4. The pooler also helps performance by reusing connections.
**Lesson:** When picking hosting tiers, verify the network stack matches your database's network stack.

### Obstacle 4: Database password breaking URLs
**Problem:** Our database password contained `!@#$`. The `@` symbol in a URL is the user/host separator, so the connection string parsed incorrectly. The `#` was treated as a fragment marker.
**Fix:** URL-encoded the special characters — `!@#$` becomes `%21%40%23%24` in the connection string.
**Lesson:** Stick to alphanumeric characters in database passwords, or always URL-encode them.

### Obstacle 5: Database migration dropped at row 800
**Problem:** When migrating 2,409 questions from local SQLite to Supabase Postgres, the connection silently dropped after ~800 rows because the Supabase **transaction pooler** has a short-lived connection model.
**Fix:** Rewrote the migration script to commit in **batches of 50** with a fresh database session per batch. Pre-fetched all existing IDs in one query so we don't query the DB per row. Switched from the transaction pooler (port 6543) to the session pooler (port 5432).
**Lesson:** For long-running data migrations, always batch and use connection pooling that fits your workload.

### Obstacle 6: PostgreSQL doesn't have a `DATETIME` type
**Problem:** Our schema migration used `ALTER TABLE … ADD COLUMN started_at DATETIME`. SQLite (development) accepts this. PostgreSQL (production) doesn't — it uses `TIMESTAMP`. The Render deployment crashed on startup with `type "datetime" does not exist`.
**Fix:** Changed `DATETIME` → `TIMESTAMP` in the migration script. Both databases accept `TIMESTAMP`.
**Lesson:** When supporting multiple databases, stick to the SQL standard subset that works on both.

### Obstacle 7: Vercel double-path issue
**Problem:** The Vercel project has its "Root Directory" set to `SAT_platform/frontend`. When running `vercel` from inside that folder, Vercel concatenated paths and tried to find `SAT_platform/frontend/SAT_platform/frontend` — which doesn't exist.
**Fix:** Always run `vercel --prod` from the **repo root** (`~/Desktop/sat-prep-platform`). Vercel then resolves the Root Directory correctly.
**Lesson:** Read Vercel's project settings carefully when working with monorepos.

### Obstacle 8: SQL injection / data leak prevention
**Problem:** A naïve API would let users do things like `?email=' OR 1=1 --` to bypass auth, or read other users' data by guessing IDs.
**Fix:** SQLAlchemy uses **parameterized queries** by default — strings are never concatenated into SQL, so injection is structurally impossible. Every protected route checks `current_user.id` against the resource's owner before returning anything (e.g., `if attempt.user_id != current_user.id: raise 403`).
**Lesson:** Use an ORM. Never write raw SQL with string interpolation.

### Obstacle 9: Math content rendering
**Problem:** Math questions contain LaTeX like `\(x^2 + y^2 = r^2\)`. Plain text doesn't render this — students would see the literal backslashes.
**Fix:** Wrote a `renderMath()` utility that scans question text for `\[…\]`, `\(…\)`, and `$…$` delimiters and converts them to KaTeX HTML. The HTML is injected into the page via React's `dangerouslySetInnerHTML`.
**Lesson:** Math notation is non-negotiable for STEM content. Pick a math renderer (KaTeX or MathJax) early.

### Obstacle 10: Image quality in scraped questions
**Problem:** Some math questions in the source PDFs include figures (graphs, geometry diagrams). When extracted by Claude vision, the images came out as base64 PNGs of varying quality — sometimes blurry, sometimes cropped poorly.
**Fix:** For the practice test, we filter to **questions without images** (`image IS NULL`). This guarantees a clean test experience. For the practice bank (where users self-select questions), we keep all questions including those with images.
**Lesson:** Build features around the constraints of your data, not the other way around.

---

## 10. Security & Privacy

| Concern | How We Handle It |
|---|---|
| Password storage | Hashed with **bcrypt** (with built-in salt). The original password is never stored. |
| Authentication | JWT signed with a secret key (32-byte random hex). Tokens expire after 30 minutes. |
| SQL injection | Prevented by SQLAlchemy parameterized queries. |
| Cross-Site Request Forgery (CSRF) | JWT in `Authorization: Bearer …` header (not in a cookie), so CSRF doesn't apply. |
| CORS (cross-origin requests) | Whitelist: only the production frontend URL and `localhost:3000` can call the API. |
| HTTPS | Automatic on Vercel and Render — both issue Let's Encrypt certificates. |
| Secret management | All API keys (Stripe, Groq, database password) are environment variables on Render. They never appear in the codebase or in Git. |
| Payment data | We never see card numbers. Stripe Checkout handles them; we only store the resulting subscription state. |
| User data scope | Every API endpoint that touches user data verifies `user_id` matches the authenticated user. |

---

## 11. Costs & Resource Usage

| Service | Plan | Monthly Cost |
|---|---|---|
| Vercel (frontend hosting) | Hobby | **$0** |
| Render (backend hosting) | Free | **$0** |
| Supabase (Postgres database) | Free | **$0** |
| Groq (AI tutor) | Free tier (~14k req/day) | **$0** |
| Anthropic (Claude vision, used during data prep only) | Pay-as-you-go | **~$5 one-time** for processing all PDFs |
| Stripe | No platform fee, only takes 2.9% + 30¢ per transaction | **$0** until first payment |
| Domain | Currently using Vercel subdomain | **$0** |

**Total: ~$0/month at current scale.**

The free tiers comfortably support **hundreds of users**. The bottleneck would be:
- Render: 750 free hours/month — sleeps after 15 min idle (cold start ~30s).
- Supabase: 500 MB DB storage (currently ~5 MB used).
- Groq: 14k requests/day shared across all users.

To upgrade for serious traffic: ~$7/mo for Render Starter (no sleep), ~$25/mo for Supabase Pro. So even a paid setup is **under $50/month**.

---

## 12. Object-Oriented Design — The Four Pillars in Practice

OOP isn't just a textbook concept here — every layer of the project applies it. Below are concrete examples from the actual source code.

### Encapsulation
Encapsulation means bundling data and the behavior that operates on it into one unit, and hiding internal details from the outside world.

- **`User` model (`app/models.py`)**. The `User` class groups all user-related fields — `email`, `password_hash`, `subscription_plan`, `ai_messages_used`, `ai_messages_limit` — together with the table metadata. External code never touches `password_hash` directly; it goes through bcrypt in the auth router. Nobody outside the `User` class needs to know how the hash is stored.

- **`AuthContext` in React (`context/AuthContext.tsx`)**. The `AuthProvider` component encapsulates *all* auth state (token, user object) and *all* auth operations (login, register, logout). Any component across the entire app calls `useAuth()` and gets a clean interface. Components don't know that the token is stored in `localStorage`, that an Axios interceptor attaches it to every request, or that a 401 response clears it — those details are hidden inside the context.

- **`api.ts` Axios instance (`lib/api.ts`)**. The shared HTTP client wraps the base URL, the token injection, and the 401 redirect into one object. Every page just calls `api.get(...)` or `api.post(...)` — they have no idea how authentication works at the HTTP level.

---

### Inheritance
Inheritance lets a class acquire the properties and methods of a parent class, avoiding duplication.

- **All database models inherit from `Base`**. `Base` is SQLAlchemy's declarative base class. Every model — `User(Base)`, `Question(Base)`, `Progress(Base)`, `FlashcardDeck(Base)`, `Flashcard(Base)`, `ExamAttempt(Base)` — inherits table registration, session tracking, and ORM query capabilities from it. Without inheritance we would have to implement that infrastructure six times.

- **All API schemas inherit from `BaseModel`** (Pydantic). `StartExamResponse(BaseModel)`, `SubmitExamRequest(BaseModel)`, `ExamResultResponse(BaseModel)`, `CheckoutRequest(BaseModel)` — by inheriting from `BaseModel`, every schema gets automatic JSON parsing, field validation, and serialization for free. We only define the fields that are unique to each schema.

- **`Settings(BaseSettings)`** in `app/config.py`. Our configuration class inherits from Pydantic's `BaseSettings`, which adds the ability to read values from environment variables and `.env` files automatically. We inherit that capability without writing any parsing code.

---

### Polymorphism
Polymorphism means different objects or inputs responding to the same interface in different ways.

- **`normalize_section()` function (`routers/questions.py`)**. A single function accepts any of these inputs: `"r&w"`, `"reading"`, `"english"`, `"rw"`, `"math"`, `"mathematics"`, `"maths"` — and maps them all to either `"rw"` or `"math"`. The rest of the codebase calls one function regardless of how the section was originally stored or sent. Many input forms, one output contract.

- **AI provider fallback (`routers/ai_tutor.py`)**. The AI tutor uses a `get_llm_client()` function that returns an `OpenAI`-compatible client pointing at either the Groq API or OpenAI, depending on which key is configured. Both providers speak the OpenAI chat completions protocol. The rest of the router calls `client.chat.completions.create(...)` identically — it doesn't know or care which backend is answering. Swapping providers requires zero changes to the calling code.

- **SQLAlchemy filters work across database engines**. `query.filter(Question.image.is_(None))` runs correctly on both SQLite (development) and PostgreSQL (production). Same Python code, different SQL dialects underneath — the ORM provides the polymorphic translation layer.

- **KaTeX rendering in React**. The `renderMath()` utility accepts any string — plain text, a string with `\[…\]` block math, `\(…\)` inline math, or `$…$` shorthand. It processes each format uniformly through the same function. Callers don't need to know which delimiter style was used.

---

### Abstraction
Abstraction means exposing only what a caller needs to use, hiding implementation complexity behind a simple interface.

- **`get_current_user` dependency (`app/dependencies.py`)**. Every protected route declares `current_user: User = Depends(get_current_user)` and receives a ready-to-use `User` object. Hidden behind this one line: JWT decoding, signature verification, expiry checking, database lookup, and 401 error raising if anything fails. Routes contain zero auth logic.

- **`get_db` dependency injection**. Any route that needs the database declares `db: Session = Depends(get_db)`. This single argument hides session creation, connection pooling, and session teardown (via `finally: db.close()`). Routes work with a plain `Session` object and never manage connections themselves.

- **SQLAlchemy ORM as SQL abstraction**. `db.query(Question).filter(Question.section == "math").order_by(func.random()).limit(22).all()` reads like English and runs on both SQLite and PostgreSQL. Without the ORM this would be raw SQL strings, manual parameterization to prevent injection, and separate handling per database engine.

- **`renderMath()` utility (`lib/renderMath.ts`)**. One function call converts any math-containing string into rendered HTML. The component sets `dangerouslySetInnerHTML={{ __html: renderMath(content) }}` and is done. The KaTeX library, delimiter detection, and HTML sanitization are completely hidden.

---

### Summary Table

| Pillar | Where it appears in MaxSAT |
|---|---|
| Encapsulation | `User` model, `AuthContext`, `api.ts` Axios client |
| Inheritance | All SQLAlchemy models inherit `Base`; all schemas inherit `BaseModel`; `Settings` inherits `BaseSettings` |
| Polymorphism | `normalize_section()`, AI provider fallback (Groq/OpenAI), SQLAlchemy cross-DB filters, `renderMath()` |
| Abstraction | `get_current_user` dependency, `get_db` dependency, SQLAlchemy ORM, `renderMath()` |

---

## 13. What's Next (Roadmap)

Even after the demo, here are well-scoped next steps:

- **Google Sign-In** (OAuth) — remove email/password friction. ~1 day of work.
- **More practice tests** — currently 1; the architecture supports unlimited variants.
- **Adaptive Module 2** — the real Digital SAT changes Module 2 difficulty based on Module 1 performance. This is straightforward to add since we already pick questions from the bank.
- **Stripe webhooks** — listen to `customer.subscription.deleted` to auto-downgrade users.
- **Team / classroom mode** — let teachers see student progress.
- **Spanish localization** — significant value-add since Spanish-speaking students are underserved by SAT prep tools.

---

## 14. Anticipated Q&A (Defense Cheat Sheet)

### "Did you build this yourself or did AI do it for you?"
Both. The project's **architecture** — what features exist, how the database is structured, how the practice test mimics Bluebook, how the data pipeline works — was designed deliberately. The **implementation** was significantly accelerated using Claude Code (Anthropic's coding assistant), which is the modern equivalent of using IDEs, autocompletion, and Stack Overflow. The understanding required to design, debug, and deploy the system is the same as in any software project. When deployment failed (Railway, then Python 3.14, then IPv6, then `DATETIME` vs `TIMESTAMP`), AI couldn't auto-fix any of those — they required reading logs, understanding the systems involved, and choosing among multiple plausible fixes.

### "Why didn't you use a no-code tool like Bubble or Wix?"
No-code tools couldn't deliver:
- **Custom KaTeX math rendering** (no SAT prep tool can ship without it).
- **A real Bluebook-style timed test** with our specific scoring algorithm.
- **A custom data pipeline** that uses Claude vision to read math PDFs.
- **JWT-based authentication** with row-level security on every endpoint.

No-code is fine for landing pages and CRMs. It's not built for math-heavy education software.

### "How does the AI tutor know SAT-specific content?"
The AI tutor uses Llama 3.3 70B (a general-purpose 70-billion-parameter language model). General models trained on the internet have absorbed most public SAT prep content — explanations, strategies, vocabulary, math methods — so they're already strong at this domain. We add a **system prompt** that tells the model "You are an SAT tutor; be encouraging and explain step-by-step." That's enough to get focused, helpful responses without fine-tuning.

### "Where do the questions come from? Is this legal?"
Questions are from **College Board's free, publicly distributed practice PDFs**. These are released for student use. We are not redistributing copyrighted, paid SAT material. We process them into a queryable format for educational use, which falls under standard fair-use practice for an educational platform. (For an actual launch we would want to clear this with a lawyer, but for academic-defense purposes the source is unambiguously open.)

### "What stops a student from cheating during the practice test?"
Nothing — and that's fine. This is a **practice** test, not a real one. The goal is for students to honestly assess themselves. The real Digital SAT (Bluebook) runs in a locked-down kiosk app on a tablet, not in a browser. We're not trying to replicate the security; we're replicating the test format and feel.

### "How would you scale this to 10,000 users?"
- Frontend (Vercel) is on a global CDN — scales for free.
- Backend (Render): upgrade to Standard ($25/mo) and add 2–3 instances. The API is stateless so this works without code changes.
- Database (Supabase): upgrade to Pro ($25/mo) for connection pooling.
- AI tutor: Groq's free tier shares 14k requests/day across the whole IP. At 10k users we'd need a paid Groq plan (~$30/mo) or switch to OpenAI (~$50–100/mo).

So **~$100/month covers ~10,000 users**.

### "What if Groq goes down?"
Our backend has **automatic fallback to OpenAI**. The `ai_tutor.py` router checks for `GROQ_API_KEY` first, then `OPENAI_API_KEY`. If both are set, Groq is used; if Groq returns errors, we can flip a flag and traffic moves to OpenAI without code changes.

### "Why not store passwords in the database directly?"
Storing plaintext passwords would be a critical security failure. If our database leaks, all user passwords would leak — and worse, since users reuse passwords, their other accounts (banks, email) would be at risk. Bcrypt makes the hash one-way: we can verify a password by hashing what the user typed and comparing, but we can't recover the original.

### "What's the most technically interesting part of this project?"
The **math question pipeline**: rendering PDF pages as images, sending them to a vision model, getting back structured JSON with LaTeX math preserved, and storing that for use in a queryable database. This is a non-trivial integration of AI into a real data pipeline — and it's the only practical way to extract math from PDFs at this scale. Six months ago this approach didn't exist; vision models are *just now* good enough to do it reliably.

### "What would you do differently if you started over?"
- Use **GitHub-based auto-deploy from day one** (right now we deploy via CLI). One push → automatic frontend + backend deployment.
- Add **automated testing** earlier (unit tests for the scoring logic, integration tests for the auth flow). We tested manually, which works but doesn't scale.
- Pick a **single hosting platform** for both frontend and backend instead of splitting Vercel + Render — it would simplify environment variable management.

### "How long did this take?"
The bulk of features were implemented over ~2 weeks of focused work, including data pipeline, auth, practice mode, AI tutor, flashcards, analytics, full practice test, Stripe integration, and production deployment. AI assistance compressed what would have been a several-month solo project.

---

## 15. Glossary (For Non-Technical Audience)

- **API**: Application Programming Interface. The backend's public "menu" of operations the frontend can call (login, get questions, submit answer, etc.).
- **Backend**: The server that holds the data and runs the business logic.
- **CDN**: Content Delivery Network. A global cache that serves your website from a nearby city to make it fast.
- **Frontend**: The website / UI the user sees in the browser.
- **Framework**: A pre-built foundation that handles the boilerplate (routing, rendering) so we focus on features.
- **JWT** (JSON Web Token): A small encrypted string that proves a user is logged in.
- **LaTeX**: A markup language for math (`\frac{1}{2}` becomes ½).
- **ORM** (Object-Relational Mapper): A library that lets us write database queries in our programming language instead of in SQL.
- **PostgreSQL**: A reliable open-source database used by major companies.
- **REST API**: A standard way to organize backend endpoints (`GET /users`, `POST /questions`, etc.).
- **SPA** (Single-Page Application): A website that loads once and updates dynamically without full page reloads.
- **TypeScript**: JavaScript with type checking — catches mistakes before the code runs.
- **JWT secret**: A 32-byte random string used to sign tokens. If leaked, an attacker could forge logins, so it's stored as an environment variable, not in code.

---

## 16. Live Demo Flow (For The Defense)

1. **Open** https://satplatform-three.vercel.app
2. **Register** a fresh account → see the dashboard with empty stats.
3. **Click "Practice"** → choose a domain → answer 2–3 questions to show real data.
4. **Click "Practice Test"** → start a full test → answer a few questions in each module → submit → show scaled score.
5. **Click "AI Tutor"** → ask "Why is the answer to this absolute value question B?" → show real Llama 3.3 response.
6. **Click "Flashcards"** → study a card → grade as "Got it" → show the SRS interval doubling.
7. **Click "Progress"** → show real accuracy bars by domain and weak skill identification.
8. **Click "Pricing"** → click "Upgrade" → Stripe Checkout opens → enter test card `4242 4242 4242 4242` → return to dashboard upgraded to Basic.

---

## Conclusion

MaxSAT is a fully functional, production-deployed, AI-augmented SAT prep platform. Every architectural choice was made with clear reasoning about tradeoffs, costs, and scalability. The use of AI as a development tool — like the use of any powerful tool — reflects modern engineering practice; the engineering judgment, system design, and problem-solving when things broke (Python version, IPv6, datetime types, password URL-encoding) is the developer's own work and is the meaningful, defensible contribution.
