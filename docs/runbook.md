# My Civics Class — Runbook

Operational reference for local development and deployment.

> **Deploying to mycivicsclass.com?** Step-by-step in
> [`deployment-vercel.md`](./deployment-vercel.md). Read its
> "the one thing that will lock you out" section first — mock auth is disabled in
> production and `/admin/users` has no activation UI, so the first Google sign-in
> locks itself out without `npm run admin:bootstrap`.

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

Copy `.env.example` to `.env.local` for local development. Full inventory:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string. Holds curriculum and the teacher account only |
| `SESSION_SECRET` | Yes | Signs the teacher session cookie **and** completion codes and readiness tokens (`openssl rand -base64 32`). Changing it signs the teacher out and makes previously issued completion codes stop verifying |
| `TEACHER_ALLOWED_EMAILS` | Yes | Comma-separated exact Google addresses that may sign in. **Unset or empty = nobody can sign in.** Addresses, not a domain |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Yes (for teacher sign-in) | Google OAuth. Production redirect: `https://mycivicsclass.com/api/auth/callback/google` |
| `NEXTAUTH_URL` | Yes | NextAuth base URL. Production: `https://mycivicsclass.com` |
| `APP_BASE_URL` | Yes | App base URL |
| `NODE_ENV` | Yes | `development` / `production` |

There are no feature flags, no retention windows and no demo-login switch any more.
`MOCK_AUTH`, `DEMO_OPEN_LOGIN`, `CLEVER_*`, `GOOGLE_ALLOWED_DOMAINS`, `FEATURE_*` and
`*_RETENTION_DAYS` are ignored if still set, and can be deleted from the host.

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

---

## Teacher sign-in (Google)

Students never sign in. Google sign-in exists only for the teacher/admin who
authors lessons.

1. https://console.cloud.google.com → create or select a project
2. Credentials → OAuth 2.0 Client IDs → Web application
3. Add the **Authorized redirect URI**: `http://localhost:3000/api/auth/callback/google`
   (production: `https://mycivicsclass.com/api/auth/callback/google`)
4. Copy the Client ID and Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
5. Put the teacher's exact address in `TEACHER_ALLOWED_EMAILS`

An address on the list is created as an active TEACHER on first sign-in, with
one class to arrange lessons for. An address not on the list is refused before
anything is written. To make an account an admin:
`npm run admin:bootstrap -- --email you@example.com --apply`.

There is no demo or mock login. For local testing without Google, the e2e setup
(`tests/e2e/global-setup.ts`) mints a session cookie from the local
`SESSION_SECRET`.

---

## The no-student-data migration

`prisma/migrations/20261116120000_no_student_data` drops every student-linked
table and deletes student and parent accounts. It is **destructive and has no
down path**. It has been run on local and test databases only. Before running
it anywhere else, take a backup and decide what, if anything, must be returned
to families first.
