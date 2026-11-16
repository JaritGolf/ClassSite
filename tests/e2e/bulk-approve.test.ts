/**
 * E2E Tests — Bulk Approve Flow
 *
 * Playwright: navigate to content queue, trigger bulk approve, assert result.
 *
 * GATED on process.env.E2E === '1'.
 * Run with: E2E=1 npx playwright test tests/e2e/bulk-approve.test.ts
 */

import { test, expect } from '@playwright/test'

const RUN_E2E = process.env.E2E === '1'

test.describe('Bulk approve flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/teacher.json' })

  if (!RUN_E2E) {
    test.skip(true, 'Set E2E=1 to run Playwright tests')
    return
  }

  test('content queue renders and shows items', async ({ page }) => {
    await page.goto('/teacher/content')

    // Should not be redirected to login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1')).toContainText('Content Approval Queue')
  })

  test('bulk approve page renders filter builder', async ({ page }) => {
    await page.goto('/teacher/content/bulk-approve')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('h1')).toContainText('Bulk Approve Content')

    // Entity type selector is present
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('bulk approve confirm dialog opens on click', async ({ page }) => {
    await page.goto('/teacher/content/bulk-approve')

    await page.click('button:has-text("Preview")')

    // Dialog should appear
    await expect(page.locator('text=Confirm Bulk Approve')).toBeVisible()
  })
})
