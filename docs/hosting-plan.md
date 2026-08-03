# My Civics Class — Hosting & Data Storage Plan (Phase 17)

> Audit §36.18 item 4. Documents the deployment/hosting posture for district review.
> **This is a proposal for owner + district sign-off, not an approved configuration.**
> Spec §37 requires district confirmation of hosting/security requirements before real
> student data is stored.

## 1. Application topology

- **App:** Next.js 14 (App Router) — server components + API routes. Stateless; horizontally
  scalable behind a load balancer.
- **Database:** PostgreSQL 16 (managed instance recommended for production).
- **Sessions:** stateless JWT cookies (no session store needed).
- **Background work:** none required for MVP. The retention purge is admin-triggered
  (`/admin/retention` or `npm run retention:purge`); no queue/cron is deployed (spec §26
  lists the queue as optional). If scheduled retention is later required, run the script from
  a cron/scheduled job — see `docs/audits/deferred/phase-17.md`.

## 2. Hosting options (to be chosen with district)

| Option | Pros | Cons | District fit |
|---|---|---|---|
| District-managed infra (on-prem / district cloud) | Data stays in district control | Ops burden on district IT | Most likely required for student PII |
| Vercel + managed Postgres (Neon/Supabase/RDS) | Fast, low-ops | Data leaves district perimeter — needs DPA | Acceptable only with district approval + signed DPA |
| Self-managed cloud (district AWS/Azure/GCP account) | Control + scale | Setup effort | Strong fit if district has a cloud tenancy |

**Recommendation:** host within a district-owned cloud tenancy or on-prem, Postgres in the
same trust boundary. Confirm with PBCSD IT.

## 3. Security requirements (spec §25.2)

- **TLS 1.2+** terminated at the ingress/load balancer; HTTP redirected to HTTPS.
- **Encryption at rest** for the database volume and backups (managed-Postgres default or
  LUKS/KMS-backed volumes).
- **Secrets** (`DATABASE_URL`, `SESSION_SECRET`, OAuth client secrets) injected via the
  platform secret manager — never committed. `MOCK_AUTH` must be unset/false in production
  (enforced in code when `NODE_ENV=production`).
- **Network:** database not publicly reachable; app→DB over a private network.
- **Backups:** automated daily Postgres backups with district-defined retention; restore
  tested.

## 4. Environment variables

See the full inventory in `docs/runbook.md` and `.env.example`. All are documented
(audit §36.18 item 6).

## 5. Sign-off checklist (owner → district)

- [ ] Hosting location/tenancy approved.
- [ ] At-rest encryption + backup policy approved.
- [ ] TLS configuration verified.
- [ ] Secret-management approach approved.
- [ ] Disaster-recovery / restore procedure documented and tested.
