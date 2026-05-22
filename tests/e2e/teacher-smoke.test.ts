/**
 * E2E Tests — Teacher Smoke
 *
 * Playwright: log in as mock teacher, navigate every teacher page,
 * assert no console errors.
 *
 * GATED on process.env.E2E === '1'.
 * Run with: E2E=1 npx playwright test tests/e2e/teacher-smoke.test.ts
 */

import { test, expect } from '@playwright/test'

const RUN_E2E = process.env.E2E === '1'

const TEACHER_PAGES = [
  '/teacher/dashboard',
  '/teacher/classes',
  '/teacher/benchmarks',
  '/teacher/decay',
  '/teacher/calibration',
  '/teacher/interventions',
  '/teacher/content',
  '/teacher/settings',
  '/teacher/reports',
]

test.describe('Teacher smoke — all pages render', () => {
  if (!RUN_E2E) {
    test.skip(true, 'Set E2E=1 to run Playwright tests')
    return
  }

  test.beforeEach(async ({ page }) => {
    // Use stored auth state from global-setup
    const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    await page.goto(`${BASE_URL}/teacher/dashboard`)
    // If redirected to login, fail early with a clear message
    await expect(page).not.toHaveURL(/\/login/)
  })

  for (const path of TEACHER_PAGES) {
    test(`${path} renders without console errors`, async ({ page }) => {
      const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const consoleErrors: string[] = []

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      const response = await page.goto(`${BASE_URL}${path}`)
      expect(response?.status()).not.toBe(500)

      await page.waitForLoadState('networkidle')

      // Filter out known benign errors
      const realErrors = consoleErrors.filter(
        (e) =>
          !e.includes('hydration') &&
          !e.includes('favicon') &&
          !e.includes('P2002')
      )

      expect(realErrors).toHaveLength(0)
    })
  }
})
