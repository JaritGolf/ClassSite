import type { Config } from 'jest'

// CRITICAL: do NOT let jest-haste-map crawl junk directories at bootstrap.
// Abandoned agent git worktrees under `.claude/worktrees/*` each carry a full
// `node_modules.nosync` copy (≈2000 package.json files across several worktrees);
// crawling them froze jest at startup before any test ran — the long-standing
// "jest hangs at bootstrap" issue (Phases 12–14). `roots` confines the crawl to
// the real source dirs, so root-level cruft (`.claude/`, `.next.nosync/`,
// `node_modules 2/`, iCloud dupes) is never visited at all.
//
// Belt-and-suspenders for anything reached despite `roots`. NOTE: the live
// dependency tree is `node_modules -> node_modules.nosync` (symlinked out of
// iCloud sync since 2026-07-13 — eviction stalled `next dev` boots for many
// minutes), so a broad `\.nosync/` pattern here would match realpath-resolved
// modules and break the loader; keep patterns anchored and specific.
const modulePathIgnorePatterns = [
  '<rootDir>/\\.claude/',
  '<rootDir>/\\.next/',
  '<rootDir>/\\.next\\.nosync/',
  '<rootDir>/node_modules \\d',
]

const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
}

// `satisfies` (not a bare object) so the ts-jest entry keeps its tuple type —
// widened to an array, jest's own config types reject it.
const transform = {
  // Transpile-only (no per-run type-checking) for speed; `isolatedModules: true`
  // lives in tsconfig.json. Full type-checking is owned by `tsc --noEmit` (the
  // Tier 1 gate). See ADR 0006.
  //
  // `jsx: 'react-jsx'` is needed by the component project and harmless to the
  // node one, which compiles no .tsx.
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: { moduleResolution: 'node', jsx: 'react-jsx' } }],
} satisfies Config['transform']

/**
 * Two projects, deliberately.
 *
 * The component tests need a DOM, but this repo has a long, documented history
 * of jest bootstrap fragility, and every one of the ~150 existing suites is
 * written against `testEnvironment: 'node'` and a real Postgres connection.
 * Flipping the global environment to jsdom to accommodate a handful of new
 * component tests would put all of that at risk for no benefit — jsdom is
 * slower, and it shims globals (fetch, TextEncoder, crypto) that the Prisma and
 * NextAuth suites currently get from Node.
 *
 * So: `node` keeps the existing unit + integration suites exactly as they were,
 * and `component` is a separate project with its own roots that cannot reach
 * them. Sharding (`--shard=i/4`, required because a full run exhausts Postgres
 * connections) works across both.
 */
const config: Config = {
  projects: [
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      // Bound the Prisma connection pool so a full serial run can't approach
      // Postgres max_connections (see tests/jest.setup.ts).
      setupFiles: ['<rootDir>/tests/jest.setup.ts'],
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
      ],
      roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/seed', '<rootDir>/scripts'],
      moduleNameMapper,
      transform,
      modulePathIgnorePatterns,
    },
    {
      displayName: 'component',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/tests/component/setup.ts'],
      testMatch: ['<rootDir>/tests/component/**/*.test.tsx'],
      // Narrower than the node project on purpose — no `seed` or `scripts`, and
      // no DB. A component test that needs Postgres is in the wrong project.
      roots: ['<rootDir>/src', '<rootDir>/tests/component'],
      moduleNameMapper,
      transform,
      modulePathIgnorePatterns,
    },
  ],
  // Integration tests share a real PostgreSQL database; running suites in
  // parallel causes race conditions (e.g. seed deletes option rows that another
  // suite is relying on). maxWorkers: 1 ensures test files run serially.
  maxWorkers: 1,
  // Integration suites seed real data in beforeAll; give DB hooks/tests headroom
  // (the bounded connection pool makes heavy seeds a bit slower than the 5s default).
  testTimeout: 30000,
}

export default config
