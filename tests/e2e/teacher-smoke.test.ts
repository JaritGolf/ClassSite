/**
 * E2E Tests — Teacher Smoke
 *
 * Playwright: with the teacher session from global-setup, visit every teacher page,
 * assert no console errors.
 *
 * GATED on process.env.E2E === '1'.
 * Run with: E2E=1 npx playwright test tests/e2e/teacher-smoke.test.ts
 */

import { test, expect } from '@playwright/test'

const RUN_E2E = process.env.E2E === '1'

const TEACHER_PAGES = [
  '/teacher/dashboard',
  '/teacher/check-codes',
  '/teacher/lessons',
  '/teacher/benchmarks',
  '/teacher/questions',
  '/teacher/content',
  '/teacher/classes',
  '/teacher/settings',
]

test.describe('Teacher smoke — all pages render', () => {
  test.use({ storageState: 'tests/e2e/.auth/teacher.json' })

  if (!RUN_E2E) {
    test.skip(true, 'Set E2E=1 to run Playwright tests')
    return
  }

  test.beforeEach(async ({ page }) => {
    // Use stored auth state from global-setup
    await page.goto('/teacher/dashboard')
    // If redirected to login, fail early with a clear message
    await expect(page).not.toHaveURL(/\/login/)
  })

  for (const path of TEACHER_PAGES) {
    test(`${path} renders without console errors`, async ({ page }) => {
      const consoleErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      const response = await page.goto(path)
      expect(response?.status()).not.toBe(500)

      await page.waitForLoadState('networkidle')

      // Filter out known benign errors
      const realErrors = consoleErrors.filter(
        (e) =>
          !e.includes('hydration') &&
          !e.includes('favicon') &&
          !e.includes('P2002') &&
          // beforeEach lands on the dashboard, whose links Next starts
          // prefetching; navigating away straight afterwards cancels those
          // requests, and a production build logs each cancellation.
          !e.includes('Failed to fetch RSC payload')
      )

      expect(realErrors).toHaveLength(0)
    })
  }
})
