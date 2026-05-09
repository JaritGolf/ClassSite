# Civics Quest — Runbook

Operational reference for local development and deployment.

---

## Environment Versions

| Component | Version | Notes |
|---|---|---|
| Node.js | 25.6.1 | `/opt/homebrew/bin/node` |
| npm | 11.9.0 | bundled with Node |
| PostgreSQL | 16.13 (Homebrew) | arm64-apple-darwin25 |
| OS | macOS (aarch64 / Apple Silicon) | |
| Next.js | ^14 | see `package.json` |
| Prisma | ^5 | ORM |
| TypeScript | ^5 | |

---

## Local PostgreSQL (Homebrew)

```bash
# Start (and auto-start at login)
brew services start postgresql@16

# Stop
brew services stop postgresql@16

# Run without background service
LC_ALL="en_US.UTF-8" /opt/homebrew/opt/postgresql@16/bin/postgres \
  -D /opt/homebrew/var/postgresql@16

# Connect
psql -U $(whoami) postgres

# Create dev database
createdb civics_quest_dev

# Drop and recreate (full reset)
dropdb civics_quest_dev && createdb civics_quest_dev

# Check status
brew services list | grep postgresql
```

---

## Database Setup

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Run migrations in development (creates migration files)
npm run db:migrate

# Apply migrations in CI/production (no prompts)
npm run db:deploy

# Seed the database
npm run db:seed

# Open Prisma Studio (visual DB browser)
npm run db:studio
```

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development. Required at minimum:

- `DATABASE_URL` — PostgreSQL connection string
- `MOCK_AUTH="true"` — enables mock auth in dev (never in production)
- `NODE_ENV="development"`

See `.env.example` for the full variable list with descriptions.

---

## Running Tests

```bash
# Unit + integration tests (Jest)
npm test

# Watch mode
npm test -- --watch

# Single file
npm test -- tests/unit/assessment/grading.test.ts

# End-to-end (Playwright) — requires running dev server
npm run test:e2e
```

---

## Common Issues

### `psql: error: connection to server on socket "/tmp/.s.PGSQL.5432" failed`
PostgreSQL is not running. Run: `brew services start postgresql@16`

### `Error: connect ECONNREFUSED` from Prisma
Check `DATABASE_URL` in `.env.local` matches your local database name and credentials.

### `PrismaClientInitializationError: Prisma Client is not yet generated`
Run: `npm run db:generate`

---

## Phase 0 Audit

Audit 0 passed: **2026-05-09**

All 7 items from spec Section 36.1 verified:
- CLAUDE.md ✅
- civics_quest_v3_build_spec.md ✅
- .env.example ✅
- Repo structure matches Section 3.2 ✅
- Node/PG versions documented here ✅
- Git initialized with .gitignore ✅
- No production secrets committed ✅
