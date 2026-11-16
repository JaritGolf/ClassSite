# My Civics Class: Build the Republic

Florida 7th Grade Civics Mastery Learning Platform — EOC-readiness focus.

- **Students** experience it as a game: build the Republic benchmark by benchmark. They have no accounts and do not sign in.
- **Teachers** author and arrange lessons, and check the completion codes students turn in through Google Classroom.
- **District:** Palm Beach County School District (Spanish / Haitian Creole populations).

**This site holds no student data.** The server never receives or stores anything about a
student; progress lives in the student's own browser. See
[`docs/no-student-data-fact-sheet.md`](docs/no-student-data-fact-sheet.md) (one page, plain
language) and [`docs/privacy-review.md`](docs/privacy-review.md).

---

## Quick Start (Local Dev)

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18 (tested on 25.6.1) | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 (tested on 11.9.0) | bundled with Node |
| PostgreSQL | 16.x | `brew install postgresql@16` |

### Setup

```bash
# 1. Clone
git clone <repo-url>
cd ClassSite

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL and SESSION_SECRET at minimum

# 4. Start PostgreSQL (if using Homebrew)
brew services start postgresql@16

# 5. Create database
createdb civics_quest_dev

# 6. Run migrations (Phase 1+)
npm run db:migrate

# 7. Seed (Phase 1+)
npm run db:seed

# 8. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Build Phase

See `CLAUDE.md` for the current state and `docs/adrs/0026-no-student-data.md` for the design.

---

## Key Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (no emit)
npm run lint         # ESLint
npm test             # Jest unit + integration tests
npm run test:e2e     # Playwright end-to-end tests
npm run db:migrate   # Run pending Prisma migrations
npm run db:seed      # Seed the database
npm run db:studio    # Prisma Studio (DB GUI)
```

---

## Non-Negotiable Rules

See `CLAUDE.md` Section "Non-Negotiable Rules" and `civics_quest_v3_build_spec.md` Section 2.2.

- The server never receives or stores anything about a student.
- Grading is server-side and stateless — the client is never trusted with correctness.
- Answer keys are never sent to the client before submission.
- PostgreSQL only. Google sign-in for the teacher only, behind a mandatory allowlist.
- No third-party analytics or telemetry.
- WCAG 2.1 AA accessibility target; reading supports are options any student can switch on.

---

## Architecture

See `docs/architecture.md` and `docs/adrs/` for architecture decision records.
