import { test, expect } from '@playwright/test'

/**
 * Student smoke — as an anonymous visitor. There is no sign-in to do: these
 * run with an empty browser and must never be sent to /login or be given a
 * cookie.
 */

test('dashboard renders for a visitor with no account', async ({ page, context }) => {
  await page.goto('/student/dashboard')
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByText(/Welcome back, Founder/)).toBeVisible()
  expect(await context.cookies()).toEqual([])
})

test('map opens exactly the first mission on a new device', async ({ page }) => {
  await page.goto('/student/map')
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.locator('[data-testid="benchmark-node"]').first()).toBeVisible({ timeout: 10000 })
})

test('progress written on the device survives a reload', async ({ page, context }) => {
  await page.goto('/student/settings')
  await page.check('#setting-largeText')
  await page.reload()
  await expect(page.locator('#setting-largeText')).toBeChecked()
  expect(await context.cookies()).toEqual([])
})

test('teacher pages still require sign-in', async ({ page }) => {
  await page.goto('/teacher/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
