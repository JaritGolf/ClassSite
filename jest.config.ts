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
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { moduleResolution: 'node' } }],
  },
  // Integration tests share a real PostgreSQL database; running suites in
  // parallel causes race conditions (e.g. seed deletes option rows that another
  // suite is relying on).  maxWorkers: 1 ensures test files run serially.
  maxWorkers: 1,
}

export default config
