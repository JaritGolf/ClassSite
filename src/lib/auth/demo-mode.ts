/**
 * Mock-auth ("open login") gate — single source of truth.
 *
 * Two ways it turns on:
 *
 *   1. `MOCK_AUTH=true` in a non-production environment — the original dev path,
 *      unchanged.
 *   2. `DEMO_OPEN_LOGIN=true` — the public-demo escape hatch. Deliberately
 *      overrides non-negotiable rule #8 ("mock auth for dev only") so the
 *      deployed site can be browsed from all four role perspectives with no
 *      account. Owner-directed, temporary, and safe only while the database
 *      holds demo/seed data exclusively. Delete the variable in Vercel and
 *      redeploy to close the site again — no code revert required.
 *
 * WHY `DEMO_OPEN_LOGIN` IS CHECKED FIRST AND ALONE:
 * `process.env.NODE_ENV` is substituted at BUILD time by webpack, so in the
 * deployed bundle any `NODE_ENV !== 'production'` comparison is a hard-coded
 * `false`. ANDing the new flag with such a check would compile it into dead
 * code and it would never work in production — the exact condition it exists
 * to bypass. `DEMO_OPEN_LOGIN` is not inlined; it is read from the real
 * environment at runtime in the serverless function.
 */
export function isMockAuthEnabled(): boolean {
  if (process.env.DEMO_OPEN_LOGIN === 'true') return true
  return process.env.MOCK_AUTH === 'true' && process.env.NODE_ENV !== 'production'
}
