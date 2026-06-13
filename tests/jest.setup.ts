/**
 * Jest setup — bound the Prisma connection pool for the test run.
 *
 * 66+ test files each construct `new PrismaClient()`. Prisma's default pool
 * (~num_cpus*2+1 connections per client) can approach Postgres `max_connections`
 * (100) across a full serial run, producing nondeterministic transaction failures
 * in unrelated suites. Capping `connection_limit` keeps total usage well under the
 * limit regardless of run order. Runs before any test module is evaluated, so the
 * adjusted DATABASE_URL is picked up by every PrismaClient.
 */

if (process.env.DATABASE_URL && !/connection_limit=/.test(process.env.DATABASE_URL)) {
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?'
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}connection_limit=3&pool_timeout=30`
}
