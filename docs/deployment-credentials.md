# Deployment Credentials — Inventory

> **No secret values live in this repository, and none ever should.**
> This file records *where* each credential lives, *what* it unlocks, and *how* to
> rotate it. If you need an actual value, get it from the system of record listed
> below — never from a file in git, a chat log, or a screenshot.

Companion to [`deployment-vercel.md`](./deployment-vercel.md).

## Systems of record

| Credential | Lives in | Unlocks | Rotate at |
|---|---|---|---|
| `DATABASE_URL` | Vercel env (Production) + Neon console | Full read/write on all student data | Neon → Roles → reset `neondb_owner`, then update the Vercel var and redeploy |
| `SESSION_SECRET` | Vercel env (Production) only | Signs/encrypts every session JWT | `openssl rand -base64 32` → update var → redeploy. **Invalidates all sessions** (everyone signed out) |
| `GOOGLE_CLIENT_ID` | Vercel env + Google Cloud Console | Public identifier; not secret | Google Auth Platform → Clients |
| `GOOGLE_CLIENT_SECRET` | Vercel env + Google Cloud Console | Completing the OAuth exchange | Clients → the client → **Add secret**, update var, redeploy, then delete the old one |
| Vercel access token | Your password manager | Full control of the Vercel account | <https://vercel.com/account/tokens> |
| Cloudflare API token | Your password manager | DNS for `mycivicsclass.com` | Cloudflare → My Profile → API Tokens |
| `CLEVER_CLIENT_SECRET` | Not yet issued | District SSO | Issued by PBCSD when Clever is approved |

Google Cloud project: `class-site-504402`. Vercel team `class-site`
(`team_i5l3GwbFzvY3mZ2lzgFkd79J`), project `civics-quest`
(`prj_LlvEEhrq97pe1j7qcK9x1THj7BZp`). Neon compute `ep-sparkling-sky-aui2yo18`,
`us-east-1`. None of those identifiers are secret — the credentials that pair with
them are.

## Rules

1. **Never commit a value.** `.env`, `.env.local`, and `.env.*.local` are
   gitignored (`.gitignore:22-26`), as is `.vercel/` (line 36). Keep it that way.
2. **`.env.example` documents names only** — never real values.
3. **A credential pasted into a chat, ticket, or email is compromised.** Rotate it,
   don't reason about who might have seen it.
4. **Least scope.** Cloudflare tokens should be Zone:DNS:Edit on this one zone, not
   Global API Key. Vercel tokens scoped to the `class-site` team only.
5. **Set expirations** on Vercel and Cloudflare tokens. A token created for one
   task should not outlive it.
6. **Rotating `DATABASE_URL` or `SESSION_SECRET` needs a redeploy** to take effect —
   updating the variable alone does nothing to the running site.

## Reading current config without exposing values

```bash
export VERCEL_TOKEN="…"
npx vercel env ls production        # names + timestamps, values stay encrypted
```

`vercel env pull` writes real values into a local `.env` file. It is gitignored, but
delete it when you're done — it is plaintext on disk.

## If a credential leaks

1. Rotate at the system of record **first** — before investigating.
2. Update the Vercel variable, redeploy.
3. For `DATABASE_URL`: check Neon's query/connection history for unfamiliar activity.
4. For a Vercel token: review deployments for any you didn't make.
5. Record it in `docs/privacy-review.md` if student data was reachable — the district
   agreement is likely to require disclosure.

## Before real student data

Everything above assumes the demo dataset. Real rosters mean student PII on Vercel
and Neon, both outside the district perimeter — see
[`hosting-plan.md`](./hosting-plan.md) §5 and
[`privacy-review.md`](./privacy-review.md). Signed DPAs with both vendors and PBCSD
hosting sign-off come first.
