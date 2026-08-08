# Deploying My Civics Class to mycivicsclass.com

> Target for the **first** deployment: a demo/preview site running seed data only —
> Alex Student, Ms Teacher, the fake roster. **No real student PII.**
> Real rosters are gated behind the district sign-offs in
> [`hosting-plan.md`](./hosting-plan.md) §6 and [`privacy-review.md`](./privacy-review.md).

## Topology

| Layer | Choice | Why |
|---|---|---|
| Registrar + DNS | Cloudflare (already) | `mycivicsclass.com` registered 2026-08-02, NS = `sergi`/`sureena.ns.cloudflare.com` |
| App | Vercel | Next.js 14 App Router runs natively — 79 API routes, 50 pages, Prisma, and NextAuth v4 all need the Node runtime, and none of them declare `export const runtime`. Zero code changes. |
| Database | Neon (managed Postgres 16) | Serverless Postgres, matches `provider = "postgresql"`. Supabase or RDS work identically — only `DATABASE_URL` changes. |
| Sessions | JWT cookie (no session store) | `session: { strategy: 'jwt' }`, no DB adapter — see `src/lib/auth/options.ts:150`. |

**Why not Cloudflare Workers:** running the app itself on Workers means
`@opennextjs/cloudflare` + Hyperdrive + Prisma driver adapters + NextAuth v4 on
`workerd`. That is a migration with real dead-end risk against a suite of 1,489
passing tests. Cloudflare still earns its keep here as registrar, DNS, and CDN.

---

## The one thing that will lock you out if you skip it

> **If `DEMO_OPEN_LOGIN=true` is set, this whole section does not apply** — the one-click
> role buttons are back and anyone can get in. See § Public demo mode below. The rest of
> this section describes the default, closed posture.

In production **mock auth is hard-disabled** — twice, deliberately
(`src/lib/auth/options.ts`, non-negotiable rule #8), unless the demo flag overrides it:

- the `mock-credentials` provider is excluded from the provider array, and
- `mockAuthorize()` returns `null`.

Both now read the single predicate `isMockAuthEnabled()`
(`src/lib/auth/demo-mode.ts`), which is false in production unless `DEMO_OPEN_LOGIN=true`.

Vercel sets `NODE_ENV=production` on **every** deployment, previews included. So on
the deployed site (with the demo flag unset):

- **Mock sign-in:** gone. You cannot log in as Alex Student or Ms Teacher.
- **Clever:** needs a district OAuth app. `CLEVER_CLIENT_ID` is empty.
- **Google:** works — but `upsertUserFromSignIn` creates every new Google user as
  `role: TEACHER, status: INACTIVE`, which redirects to `/login?error=pending-approval`.
  Activation is supposed to happen in `/admin/users`, and that page is still a
  Phase-9 stub with no activation UI.

**Net effect: the first person to sign in locks themselves out, with no in-app fix.**
Step 6 below is the escape hatch. Do not skip it.

---

## Step 1 — Database (Neon)

You have to create this account yourself; I can't create accounts or handle credentials.

1. Create a project at <https://neon.tech> — region **AWS us-east-1** (closest to
   Palm Beach County; keeps app→DB latency low against Vercel's `iad1`).
2. Copy the **pooled** connection string (host contains `-pooler`). Prisma with
   many serverless invocations needs the pooler, not the direct endpoint.
3. It will look like:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

## Live deployment (as built 2026-08-02)

| | |
|---|---|
| Vercel account | `danisoncivics@gmail.com` (`danisoncivics-7161`) — **separate** from `jaritgolf` |
| Team | `class-site` / `team_i5l3GwbFzvY3mZ2lzgFkd79J` |
| Project | `civics-quest` / `prj_LlvEEhrq97pe1j7qcK9x1THj7BZp` — the Vercel project slug still carries the pre-rebrand name on purpose; renaming it changes preview URLs only |
| Domain | `mycivicsclass.com` + `www`, Cloudflare DNS-only, Vercel cert |
| Database | Neon `ep-sparkling-sky-aui2yo18`, us-east-1 |

### `.vercelignore` is load-bearing — do not delete it

`node_modules` in this repo is a **symlink** to `node_modules.nosync` (the iCloud
workaround, 2026-07-13 build decision). `.gitignore` covers it; the Vercel CLI's
default `node_modules` exclusion does **not** follow the symlink. Without
`.vercelignore`, `vercel deploy` tries to pack the whole **1.5 GB** tree instead of
the ~14 MB of tracked source, and hangs while packing — CPU burning, no upload
socket, no error, forever. With it, the build completes in about a minute.

Symptom to recognise: `vercel deploy` sits on "Deploying …" with `lsof` showing
zero TCP connections for the process.

### Git author must be a team member — why `npm run deploy` exists

The CLI attaches local git metadata to every deployment, and Vercel **rejects** any
deployment whose git author lacks access to the team:

```
readyState:       BLOCKED        (build=0s, no error in the CLI output)
readyStateReason: Git author arthur@jaritgolf.com must have access to
                  the team Class Site on Vercel to create deployments.
```

This repo's commits are authored by the **jaritgolf** identity; the Vercel team
belongs to **danisoncivics@gmail.com**. Note the project's own
`gitForkProtection` setting is *not* the control — turning it off does not help;
the check is enforced above the project level.

Worse, a `BLOCKED` deployment makes a plain `vercel deploy` hang forever, because
the CLI polls for a terminal state that never arrives. Use `--no-wait` and poll
the API if you ever need to debug this.

Two ways out:

1. **`npm run deploy`** (`scripts/deploy.sh`) — rsyncs to a temp dir without
   `.git`, so there is no author to check. Works today, changes nothing.
2. **Commit as a team member** — `git config user.email danisoncivics@gmail.com`.
   Once `HEAD` is authored by someone with team access, plain
   `vercel deploy --prod` works from the repo and the script is unnecessary.

## Deploying an update

```bash
export VERCEL_TOKEN="…"   # from https://vercel.com/account/tokens, scope: class-site
npm run deploy
```

About 90 seconds. Environment-variable changes only take effect on a **new
deployment** — setting a var does not update the running site.

Migrations are *not* run by the deploy. When the schema changes:

```bash
DATABASE_URL="<neon-direct-url>" npx prisma migrate deploy
```

Use the **direct** (non-pooler) host for migrations, the **pooled** host for the
app's `DATABASE_URL`.

## Step 2 — Vercel project

```bash
npx vercel login
npx vercel link
```

Framework preset auto-detects as Next.js. The repo already defines a
`vercel-build` script (`prisma generate && next build`) — Vercel prefers it over
`build`, so the Prisma client is regenerated on every deploy instead of being
served stale from the dependency cache.

**Migrations are deliberately NOT in `vercel-build`.** Preview deployments would
otherwise run `migrate deploy` against the production database. Migrations are an
explicit step (Step 4).

Deploy from `main`. Note the working tree currently carries uncommitted work on
`claude/explainer-hovers-teacher-admin-parent-d02095` (assessment-integrity feature,
activity sessions) — decide what you want live before pointing the domain at it.

## Step 3 — Environment variables

Set in Vercel → Project → Settings → Environment Variables, scope **Production**.

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | Neon pooled string | From Step 1 |
| `SESSION_SECRET` | `openssl rand -base64 32` | **Not** `NEXTAUTH_SECRET` — `authOptions.secret` reads `SESSION_SECRET` directly |
| `NEXTAUTH_URL` | `https://mycivicsclass.com` | Must match the live origin or OAuth callbacks fail |
| `APP_BASE_URL` | `https://mycivicsclass.com` | |
| `GOOGLE_CLIENT_ID` | from Step 5 | |
| `GOOGLE_CLIENT_SECRET` | from Step 5 | |
| `MOCK_AUTH` | **unset, or `false`** | Never `true` in production (rule #8) |
| `DEMO_OPEN_LOGIN` | `true` **while demoing**, otherwise unset | Public demo mode — see § Public demo mode. Delete to close the site |
| `FEATURE_PARENT_PORTAL` | `true` **while demoing**, else `false` | Otherwise blocked on `parent-identity-policy.md`. Required for the Parent perspective to render anything |
| `FEATURE_L1_GLOSSES` | `true` | Spanish glosses are owner-approved (ADR 0013) |
| `FEATURE_SECURE_ASSESSMENT` | `false` | Also needs per-class teacher opt-in |
| `FEATURE_EOC_REVIEW` | `true` | Republic Challenge |
| `AUDIT_LOG_RETENTION_DAYS` | `0` | 0 = retain forever |
| `VOIDED_ATTEMPT_RETENTION_DAYS` | `0` | |
| `ACTIVITY_SESSION_RETENTION_DAYS` | `0` | |

Leave `CLEVER_CLIENT_ID` / `CLEVER_CLIENT_SECRET` unset until the district issues them.

## Step 4 — Migrate and seed

Run locally against the production database — never commit the URL:

```bash
DATABASE_URL="<neon-pooled-url>" npx prisma migrate deploy
```

Then seed curriculum content plus the demo classroom:

```bash
DATABASE_URL="<neon-pooled-url>" npx tsx seed/index.ts
DATABASE_URL="<neon-pooled-url>" npx tsx seed/demo/index.ts
```

Both seeders are idempotent — safe to re-run.

## Step 5 — Google OAuth

<https://console.cloud.google.com> → APIs & Services → Credentials → OAuth client ID
→ Web application.

- **Authorized JavaScript origins:** `https://mycivicsclass.com`
- **Authorized redirect URI:** `https://mycivicsclass.com/api/auth/callback/google`

Your `@palmbeachschools.org` Workspace account may be blocked from creating OAuth
apps by district policy. If so, use a personal Google account for the demo — the
OAuth app owner does not have to be the district.

## Step 6 — Get yourself a working login (the lockout fix)

Verified against the seeded database: **every demo account has `email = NULL`.**
Mock auth upserts on `cleverId` and never sets one, so no Google sign-in can match
any of them. The demo classroom exists but is unreachable.

`requireAuth` is also a strict allowlist with **no ADMIN super-access**
(`src/lib/auth/index.ts:52`), and `/teacher/*` is `requireAuth(['TEACHER'])`
(`src/app/teacher/layout.tsx:12`) — so promoting yourself to ADMIN gets you the six
`/admin` pages and nothing else. No roster, no LMS, no student view. (The comment
in `src/middleware.ts:10` claiming ADMIN is allowed on `/teacher/*` is wrong; the
layout is the stricter, effective gate.)

### Recommended: adopt the demo teacher

Attach your Google address to the existing `mock-teacher-001` row. The Google
upsert-by-email in `upsertUserFromSignIn` then finds it, attaches your `googleId`,
sees `status = ACTIVE` (so no pending-approval bounce), and lands you in Ms
Teacher's dashboard with all six demo students. **No prior sign-in needed.**

```bash
DATABASE_URL="<neon-url>" npm run admin:bootstrap -- --email you@gmail.com --adopt TEACHER
DATABASE_URL="<neon-url>" npm run admin:bootstrap -- --email you@gmail.com --adopt TEACHER --apply
```

First call is a dry run. Refuses if the email already belongs to another user.

### If you also want the /admin pages

There is **no ADMIN account** — the demo seed prints one in its summary, but
`mock-admin-001` is only created on demand when someone signs in through mock auth,
which production disables. So `--adopt ADMIN` has nothing to attach to. Instead,
sign in with a *second* Google account (you'll be bounced to
`/login?error=pending-approval`, which is expected and creates the row), then:

```bash
DATABASE_URL="<neon-url>" npm run admin:bootstrap -- --email second@gmail.com --apply
```

That promotes the existing row to `ADMIN/ACTIVE`. It refuses to *create* users, so
the address is always one Google has already verified.

Both paths write an audit-log row (`DEMO_USER_EMAIL_ATTACHED` / `ADMIN_BOOTSTRAPPED`).
Sign out and back in afterwards to mint a fresh JWT.

### Student view

Same constraint: `Alex Student` has no email. Adopt him onto a third Google account
(`--adopt STUDENT`) if you want to demo the game side, or leave it — the teacher
walkthrough at `/teacher/lessons/[code]/walkthrough` shows the full student mission
flow without needing a student login.

---

## Public demo mode

A way to hand anyone the URL and let them browse all four perspectives with **no account
and no sign-in** — the one-click role buttons that existed throughout local testing, put
back on the live login page.

**This is a deliberate, owner-directed override of non-negotiable rule #8.** With it on,
every visitor can enter as STUDENT, TEACHER, PARENT, or ADMIN. It supersedes the entire
Step 6 lockout problem: nobody needs a bootstrapped Google account while it is on.

### Turning it on

Vercel → Project → Settings → Environment Variables, scope **Production**:

| Variable | Value | Why |
|---|---|---|
| `DEMO_OPEN_LOGIN` | `true` | Shows the role panel and re-enables the `mock-credentials` provider |
| `FEATURE_PARENT_PORTAL` | `true` | Without it, `/parent/dashboard` renders "The family portal isn't available yet" and the Parent perspective is dead |

Then redeploy — env changes do not apply to the running deployment:

```bash
VERCEL_TOKEN=… npm run deploy
```

Verify with one request; `mock-credentials` must now appear:

```bash
curl -s https://mycivicsclass.com/api/auth/providers
```

### Turning it off

Delete `DEMO_OPEN_LOGIN`, set `FEATURE_PARENT_PORTAL=false`, redeploy. The code stays in
place and goes inert — there is no revert commit to make.

### Only safe with demo data

Anyone reaching the site gets ADMIN, which can run a retention purge (deletes audit logs
and voided attempts), approve or archive content, and import EOC scores. That is
acceptable **only** because the database holds demo/seed rows exclusively. Both seeders
are idempotent, so re-running Step 4 restores anything a visitor breaks.

**Before any real student data lands in this database, turn demo mode off.** It is
listed again in § Before real student data below.

### How the gate works

One predicate, `isMockAuthEnabled()` in `src/lib/auth/demo-mode.ts`, read by all three
call sites (the provider array, `mockAuthorize`, and the login page's `showMockPanel`).

`DEMO_OPEN_LOGIN` is checked **first and on its own**, never ANDed with a `NODE_ENV`
comparison. This matters: webpack substitutes `process.env.NODE_ENV` at build time, so
in the deployed bundle `NODE_ENV !== 'production'` is a hard-coded `false` and anything
ANDed with it compiles to dead code. `DEMO_OPEN_LOGIN` is not inlined and is read from
the real environment at runtime.

## Step 7 — Cloudflare DNS

In the Cloudflare dashboard for `mycivicsclass.com` → DNS → Records:

| Type | Name | Content | Proxy |
|---|---|---|---|
| `A` | `@` | `76.76.21.21` | **DNS only** (grey cloud) |
| `CNAME` | `www` | `cname.vercel-dns.com` | **DNS only** (grey cloud) |

Then Vercel → Settings → Domains → add `mycivicsclass.com` and `www.mycivicsclass.com`.

**Start with the proxy off.** Vercel needs to reach the origin to issue its
Let's Encrypt certificate; an orange-cloud proxy in front of an un-provisioned
cert produces a redirect loop. Once the domain shows *Valid Configuration* in
Vercel you may turn the proxy on — if you do, set SSL/TLS mode to
**Full (Strict)**, or you get the same loop.

---

## Verification checklist

- [ ] `https://mycivicsclass.com` serves the landing page over TLS
- [ ] `http://` redirects to `https://`
- [ ] `/login` shows **no** mock-auth panel (confirms `NODE_ENV=production`)
- [ ] Google sign-in → `pending-approval` → bootstrap → teacher dashboard loads
- [ ] Teacher dashboard renders the demo roster (Alex Student et al.)
- [ ] A student mission loads, an assessment submits, and the score persists
- [ ] Browser devtools → Network shows **no third-party hosts** (rule #9)
- [ ] `/admin/retention` loads as ADMIN

## Before real student data

Non-negotiable rule #9 and `hosting-plan.md` both apply. Required first:

- [ ] **`DEMO_OPEN_LOGIN` deleted and redeployed** — while it is set, anyone on the
      internet can sign in as ADMIN (see § Public demo mode)
- [ ] PBCSD sign-off on hosting location — student PII would sit on Vercel (app)
      and Neon (database), **outside the district perimeter**
- [ ] Signed DPA with Vercel and with Neon
- [ ] Clever OAuth scopes confirmed against district policy (`oauth-scopes.md`)
- [ ] Production retention windows set (currently "retain forever")
- [ ] Backup + restore tested on the Neon project

Until those are done, keep the deployment on seed data.
