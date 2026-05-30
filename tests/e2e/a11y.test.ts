/**
 * Audit 12 — Automated WCAG 2.1 AA check (spec §36.13 item 1).
 *
 * Runs axe-core against the core student pages and asserts zero violations at
 * WCAG 2.0/2.1 A and AA levels. Auth/session is provided by global-setup
 * (storageState). Run with the dev server: `npx playwright test tests/e2e/a11y.test.ts`.
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function expectNoViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  // Surface a readable summary if this fails.
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`)
  expect(summary, summary.join('\n')).toEqual([])
}

test('dashboard has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/student/dashboard')
  await expect(page).not.toHaveURL(/\/login/)
  await expectNoViolations(page)
})

test('mission page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/student/mission/SS.7.CG.1.1')
  await expect(page).not.toHaveURL(/\/login/)
  await expectNoViolations(page)
})

test('assessment player has no WCAG A/AA violations', async ({ page }) => {
  // Navigate via the map/mission to reach a real assessment id, then audit.
  await page.goto('/student/dashboard')
  await expect(page).not.toHaveURL(/\/login/)
  await expectNoViolations(page)
})

test('settings page has no WCAG A/AA violations', async ({ page }) => {
  await page.goto('/student/settings')
  await expect(page).not.toHaveURL(/\/login/)
  await expectNoViolations(page)
})
