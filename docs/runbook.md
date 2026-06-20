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

Copy `.env.example` to `.env.local` for local development. Full inventory:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (prod) | Signs JWT session cookies (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes (dev) | NextAuth base URL |
| `APP_BASE_URL` | Yes | App base URL |
| `NODE_ENV` | Yes | `development` / `production` |
| `CLEVER_CLIENT_ID` / `CLEVER_CLIENT_SECRET` / `CLEVER_REDIRECT_URI` | Prod SSO | Clever OAuth (primary) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Prod fallback | Google OAuth (staff) |
| `FEATURE_L1_GLOSSES` | No | Enables L1 glosses (Phase 16); `"true"` to opt in |
| `FEATURE_PARENT_PORTAL` | No | Enables parent login (Phase 18); `"true"` only after district identity-policy sign-off (`docs/parent-identity-policy.md`) |
| `FEATURE_EOC_REVIEW` / `FEATURE_LEADERBOARDS` / `FEATURE_AI_DRAFTING` | No | Reserved flags (not yet wired) |
| `AUDIT_LOG_RETENTION_DAYS` | No | Retention threshold for audit logs; `0`/unset = keep forever (Phase 17) |
| `VOIDED_ATTEMPT_RETENTION_DAYS` | No | Retention threshold for voided attempts; `0`/unset = keep forever (Phase 17) |
| `MOCK_AUTH` | Dev only | Enables mock auth; **never** in production |

See `.env.example` for descriptions and defaults, and `docs/data-retention.md` for the
retention variables.

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

## Clever OAuth Setup (Phase 2 scaffold → production wiring in Phase 17)

Clever is the primary SSO provider for students and teachers.

### Development / Sandbox

1. Create a developer account at https://dev.clever.com
2. Create a new application
3. Set **Redirect URI** to: `http://localhost:3000/api/auth/callback/clever`
4. Under **OAuth Scopes**, enable: `read:user_id`, `read:students`, `read:teachers`
5. Copy **Client ID** → `CLEVER_CLIENT_ID` in `.env.local`
6. Copy **Client Secret** → `CLEVER_CLIENT_SECRET` in `.env.local`

### Production (Palm Beach County — Phase 17)

1. Submit a Clever district app request through the district's Clever admin
2. Update redirect URI to production domain
3. Confirm district-allowed scopes with district IT
4. Store credentials in production secrets manager (never in code)

### Known Clever Limitations

- Clever `/v3.0/me` does not return name or email — only `{ id, type, district }`
- Name/email require a second call to `/v3.0/students/{id}` or `/v3.0/teachers/{id}`
- **TODO Phase 17**: wire the second API call in `src/lib/auth/options.ts` `upsertUserFromSignIn`
- Clever does **not** support PKCE — `checks: ['state']` in `src/lib/auth/providers/clever.ts` is mandatory
- Parent accounts are not in Clever's user model — parent login is Phase 18

---

## Google OAuth Setup (Phase 2 scaffold)

Google is the fallback SSO for staff/teachers without Clever.

1. Go to https://console.cloud.google.com → Create or select a project
2. Enable the **Google+ API** (or Google Identity)
3. Credentials → OAuth 2.0 Client IDs → Web application
4. Add **Authorized redirect URI**: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** → `GOOGLE_CLIENT_ID`
6. Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`

### Role Policy

New Google sign-ins create users with `role: TEACHER, status: INACTIVE`.
An admin must activate the user in `/admin/users` before they can sign in.
Students must use Clever — Google login is for staff only.

---

## Mock Auth (Dev Only)

With `MOCK_AUTH=true` in `.env.local`, the login page shows a dev panel with
one-click sign-in buttons for STUDENT, TEACHER, PARENT, ADMIN roles.

Mock auth is **unconditionally disabled** in `NODE_ENV=production` regardless
of the `MOCK_AUTH` env var value. Never set `MOCK_AUTH=true` in staging or production.
