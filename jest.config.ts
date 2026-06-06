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
    // isolatedModules => transpile-only (no per-run type-checking) for speed.
    // Full type-checking is owned by `tsc --noEmit` (the Tier 1 gate). Without
    // this, ts-jest builds the whole-project type graph on every run and long
    // jest jobs get reaped before they complete. See ADR 0006.
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, tsconfig: { moduleResolution: 'node' } }],
  },
  // Integration tests share a real PostgreSQL database; running suites in
  // parallel causes race conditions (e.g. seed deletes option rows that another
  // suite is relying on).  maxWorkers: 1 ensures test files run serially.
  maxWorkers: 1,
}

export default config
