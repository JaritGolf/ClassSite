import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/integration/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // Transpile-only (no per-run type-checking) for speed; `isolatedModules: true`
    // lives in tsconfig.json. Full type-checking is owned by `tsc --noEmit` (the
    // Tier 1 gate). See ADR 0006.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { moduleResolution: 'node' } }],
  },
  // CRITICAL: do NOT let jest-haste-map crawl these directories at bootstrap.
  // Abandoned agent git worktrees under `.claude/worktrees/*` each carry a full
  // `node_modules.nosync` copy (≈2000 package.json files across several worktrees);
  // crawling them froze jest at startup before any test ran — the long-standing
  // "jest hangs at bootstrap" issue (Phases 12–14). `.nosync` is the iCloud-sync
  // duplicate pattern; `node_modules N` are cloud-sync dupes. Ignoring them here
  // makes a pure unit test run in ~0.3s instead of timing out at 40–70s.
  modulePathIgnorePatterns: [
    '<rootDir>/\\.claude/',
    '<rootDir>/\\.next/',
    '\\.nosync/',
    '<rootDir>/node_modules \\d',
  ],
  // Integration tests share a real PostgreSQL database; running suites in
  // parallel causes race conditions (e.g. seed deletes option rows that another
  // suite is relying on).  maxWorkers: 1 ensures test files run serially.
  maxWorkers: 1,
}

export default config
