import { test, expect, type Page } from '@playwright/test'

// ============================================================
// The "Use voice commands" nudge comes back.
//
// It is supposed to appear whenever a session opens on its first
// set, and retire only once voice control has actually been USED.
// Both dismiss paths marked it permanently seen, so swatting the
// bubble away once silenced it on every future session, which is
// not the same thing as learning what it pointed at.
//
// Swatting it is not learning it. Only the mic button is.
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('Jump higher').click()
  await page.getByPlaceholder(/before my wedding/).fill('by June')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: "Start Week 1" }).click()
}

const tip = (page: Page) => page.getByRole('button', { name: 'Use voice commands' })

async function startSession(page: Page) {
  await page.getByRole('button', { name: /Start session|Readiness check/ }).click()
  const full = page.getByRole('button', { name: /Full session/ })
  if (await full.isVisible().catch(() => false)) await full.click()
  await page.waitForTimeout(400)
}

test('the voice nudge returns on the next session after being tapped away', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  await expect(tip(page), 'the nudge never appeared at all').toBeVisible()

  // Swat it away. That is a dismissal, not an education.
  await tip(page).click()
  await expect(tip(page)).toBeHidden()

  // Leave the session and come back: it is owed another showing.
  await page.getByRole('button', { name: 'Exit session' }).click()
  await page.waitForTimeout(300)
  await startSession(page)
  await expect(tip(page), 'dismissing once silenced it for good').toBeVisible()
})

test('using the mic is what retires it', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)
  await expect(tip(page)).toBeVisible()

  await page.getByRole('button', { name: /Voice control/ }).click()
  await expect(tip(page)).toBeHidden()

  await page.getByRole('button', { name: 'Exit session' }).click()
  await page.waitForTimeout(300)
  await startSession(page)
  await expect(tip(page), 'it came back after voice had been used').toBeHidden()
})
