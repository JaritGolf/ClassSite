/**
 * SuggestionBox — browser behavior (ADR 0019).
 *
 * These are NOT optional padding. There is no jsdom/RTL in this repo
 * (jest.config.ts is testEnvironment: 'node', testMatch limited to unit +
 * integration), so the component has no unit-test path at all. More importantly,
 * its primary failure mode is invisible to any DOM-less test: the nav rows are
 * `overflow-x-auto`, the CSS overflow spec silently coerces `overflow-y` to 'auto'
 * on such a box, and an absolutely-positioned panel taller than the nav row then
 * renders with correct styles (visible, opacity 1) and never actually paints.
 * Only a real layout box can catch that — hence the boundingBox assertions below.
 *
 * The box is icon-only on every surface (owner's call). The trigger is the 36px
 * button; the textarea exists only while the panel is open.
 */

import { test, expect } from '@playwright/test'

const TRIGGER = 'button[aria-label="Suggest an improvement"]'
const FIELD = 'textarea[aria-label^="Your"]'
const PANEL = '[role="group"][aria-label="Suggestion box"]'
const TOOLTIP = '[role="tooltip"]'

test.use({ viewport: { width: 1600, height: 900 } })

test('hover opens the panel, and it paints BELOW the nav without being clipped', async ({
  page,
}) => {
  await page.goto('/student/dashboard')
  await expect(page).not.toHaveURL(/\/login/)

  const nav = page.locator('nav').first()
  const navBox = (await nav.boundingBox())!

  await page.locator(TRIGGER).hover()

  const panel = page.locator(PANEL)
  await expect(panel).toBeVisible()

  // The clipping assertion: the panel must extend past the bottom of the nav row.
  // A styles-only check ("is it visible?") passes even on the broken version.
  const panelBox = (await panel.boundingBox())!
  expect(panelBox.height).toBeGreaterThan(navBox.height)
  expect(panelBox.y + panelBox.height).toBeGreaterThan(navBox.y + navBox.height)

  // And it must stay fully on-screen horizontally (the right-edge clamp).
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth)
  expect(panelBox.x).toBeGreaterThanOrEqual(0)
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewportWidth)
})

test('the panel is reachable: moving from the trigger onto it does not close it', async ({
  page,
}) => {
  await page.goto('/student/dashboard')

  await page.locator(TRIGGER).hover()
  const panel = page.locator(PANEL)
  await expect(panel).toBeVisible()

  // Regression (owner-reported): the panel hangs 8px below a 36px trigger, so
  // travelling onto it crosses pixels owned by neither element and fires mouseleave.
  // It used to collapse on that instant — "it disappears as soon as you move the
  // cursor away from the button".
  const box = (await panel.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

  await expect(panel).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
})

test('the explainer stays up while the pointer rests on the icon, alongside the panel', async ({
  page,
}) => {
  await page.goto('/student/dashboard')

  await page.locator(TRIGGER).hover()
  const tooltip = page.locator(TOOLTIP)
  await expect(tooltip).toContainText('Suggestion box')

  // Regression (owner-reported): the explainer used to be dismissed the moment the
  // panel opened, giving it ~330ms on screen — "impossible to read". It must now
  // outlive the panel opening and persist for as long as the pointer stays put.
  await expect(page.locator(PANEL)).toBeVisible()
  await expect(tooltip).toBeVisible()
  await page.waitForTimeout(1500)
  await expect(tooltip).toBeVisible()

  // ...and the two must not sit on top of each other.
  const t = (await tooltip.boundingBox())!
  const p = (await page.locator(PANEL).boundingBox())!
  const overlaps =
    t.x < p.x + p.width && t.x + t.width > p.x && t.y < p.y + p.height && t.y + t.height > p.y
  expect(overlaps).toBe(false)
})

test('the explainer clears when the pointer leaves the icon, panel intact', async ({ page }) => {
  await page.goto('/student/dashboard')

  await page.locator(TRIGGER).hover()
  await expect(page.locator(TOOLTIP)).toBeVisible()

  // Moving onto the panel means the user is reading the form now — drop the
  // explainer, but never the form itself.
  const p = (await page.locator(PANEL).boundingBox())!
  await page.mouse.move(p.x + p.width / 2, p.y + p.height / 2)

  await expect(page.locator(TOOLTIP)).toHaveCount(0)
  await expect(page.locator(PANEL)).toBeVisible()
})

test('shows the captured page and updates it on navigation', async ({ page }) => {
  await page.goto('/student/dashboard')
  await page.locator(TRIGGER).hover()
  await expect(page.locator(PANEL)).toContainText('Dashboard')

  await page.goto('/student/map')
  await page.locator(TRIGGER).hover()
  await expect(page.locator(PANEL)).toContainText('Mission Map')
})

test('keyboard-only: focusing the trigger opens it, then it can be filled and sent', async ({
  page,
}) => {
  await page.goto('/student/dashboard')

  // Focus (not hover) must open the panel — this is the whole keyboard story, and
  // the reason SuggestionBox deliberately does not inherit ADR 0016's hover-only
  // exception (a form has no other path to its content).
  await page.locator(TRIGGER).focus()
  await expect(page.locator(PANEL)).toBeVisible()

  await page.locator(FIELD).fill('Keyboard-only submission from the e2e suite.')
  await page.getByRole('button', { name: 'Submit' }).click()

  await expect(page.locator('[role="status"]').filter({ hasText: /Thanks/ })).toBeVisible()
})

test('student box toggles between Comment and Question', async ({ page }) => {
  await page.goto('/student/dashboard')
  await page.locator(TRIGGER).click()

  await expect(page.getByRole('radio', { name: 'Comment' })).toBeChecked()
  await expect(page.locator(FIELD)).toHaveAttribute('placeholder', /Suggest an improvement/)

  await page.getByRole('radio', { name: 'Question' }).check()
  await expect(page.getByRole('radio', { name: 'Question' })).toBeChecked()
  // The whole framing follows the toggle, not just a hidden field.
  await expect(page.locator(FIELD)).toHaveAttribute('placeholder', /Ask a question/)
  await expect(page.locator(PANEL)).toContainText('question')
})

test('clicking the trigger lands the caret in the field even after a hover', async ({ page }) => {
  await page.goto('/student/dashboard')

  const trigger = page.locator(TRIGGER)
  // Regression: hover expanded the panel, the button was rendered only while
  // collapsed so it unmounted, and the click landed on empty space — the panel sat
  // open while every keystroke went nowhere.
  await trigger.hover()
  await trigger.click()

  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.type('Typed straight after opening the box.')
  await expect(page.locator(FIELD)).toHaveValue('Typed straight after opening the box.')
})

test('Escape collapses but keeps the draft, and reopening restores it', async ({ page }) => {
  await page.goto('/student/badges')

  await page.locator(TRIGGER).click()
  await page.locator(FIELD).fill('Draft that must survive an accidental Escape.')
  await page.locator(FIELD).press('Escape')
  await expect(page.locator(PANEL)).toHaveCount(0)

  await page.locator(TRIGGER).click()
  await expect(page.locator(FIELD)).toHaveValue('Draft that must survive an accidental Escape.')
})

test('a dirty draft survives a hover-out even with focus elsewhere', async ({ page }) => {
  await page.goto('/student/badges')

  await page.locator(TRIGGER).click()
  await page.locator(FIELD).fill('Unfocused but unsaved — must not be discarded.')
  // Blur, so only the draft guard (not the focus-within guard) can save it.
  await page.locator('h1').first().click()
  await page.mouse.move(10, 700)

  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
  await expect(page.locator(FIELD)).toHaveValue('Unfocused but unsaved — must not be discarded.')
})

test('the whole panel fits on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/student/dashboard')

  await page.locator(TRIGGER).click()
  await expect(page.locator(PANEL)).toBeVisible()

  // Regression: the panel was a fixed 384px clamped against window.innerWidth
  // (which includes the scrollbar gutter), so on a 375px phone its right edge —
  // and the Submit button with it — sat outside the visible viewport.
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth)
  const panelBox = (await page.locator(PANEL).boundingBox())!
  expect(panelBox.x).toBeGreaterThanOrEqual(0)
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewportWidth)

  const submitBox = (await page.getByRole('button', { name: 'Submit' }).boundingBox())!
  expect(submitBox.x + submitBox.width).toBeLessThanOrEqual(viewportWidth)
})

test('a student submission reaches the teacher queue', async ({ page }) => {
  await page.goto('/teacher/reports?tab=suggestions')
  await expect(page).not.toHaveURL(/\/login/)
  // The tabs exist and are split by kind.
  await expect(page.getByRole('link', { name: /Suggestions/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Questions/ })).toBeVisible()
})
