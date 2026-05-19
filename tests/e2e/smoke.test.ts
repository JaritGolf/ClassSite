import { test, expect } from '@playwright/test'

test('dashboard page renders student content', async ({ page }) => {
  await page.goto('/student/dashboard')
  // Should not redirect to login — session is set in global-setup
  await expect(page).not.toHaveURL(/\/login/)
  // Dashboard hero renders with "Welcome back" or "Republic"
  const body = await page.locator('body').textContent()
  expect(body).toMatch(/Welcome back|Republic/i)
})

test('map page renders benchmark nodes', async ({ page }) => {
  await page.goto('/student/map')
  await expect(page).not.toHaveURL(/\/login/)
  // Wait for at least one benchmark node to render
  await expect(page.locator('[data-testid="benchmark-node"]').first()).toBeVisible({ timeout: 10000 })
})
