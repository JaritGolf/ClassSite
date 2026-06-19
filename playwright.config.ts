import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  // This repo's dev server compiles routes on-demand, and first-compile is very
  // slow on disk-pressured machines (observed ~90s for the first route). Timeouts
  // are generous so the e2e suite is runnable locally; in CI it is far faster.
  timeout: 180000,
  expect: { timeout: 30000 },
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'tests/e2e/.auth/student.json',
    navigationTimeout: 150000,
    actionTimeout: 60000,
  },
  webServer: {
    command: 'MOCK_AUTH=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 300000,
  },
})
