# My Civics Class: Build the Republic

Florida 7th Grade Civics Mastery Learning Platform — EOC-readiness focus.

- **Students** experience it as a game: build the Republic benchmark by benchmark.
- **Teachers** experience it as an LMS with deep analytics and intervention tools.
- **District:** Palm Beach County School District (Spanish / Haitian Creole populations).

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
cd civics-quest

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL at minimum

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

See `CLAUDE.md` for current phase and `civics_quest_v3_build_spec.md` for full specification.

| Phase | Focus |
|---|---|
| **0** | Project setup, env, repo scaffold ← *current* |
| 1 | Schema, migrations, seeds |
| 2 | Auth (Clever, Google, mock) |
| 3–18 | See spec Section 33 |

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

- Server-side grading only — client is never trusted.
- Answer keys never sent to client before submission.
- PostgreSQL only (no SQLite in production).
- Clever-first SSO → Google fallback → mock for dev only.
- No third-party analytics or telemetry on student data.
- WCAG 2.1 AA accessibility target.

---

## Architecture

See `docs/architecture.md` and `docs/adrs/` for architecture decision records.
