import { expect, test, type Page } from '@playwright/test'

// ============================================================
// A period that closes comes back as a review.
//
// The owner's ask: at the end of every week, month, quarter and
// year, a Wrapped-style review of progression, highlights, goals
// and how it compares, and the week always asks for front and
// side photos.
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('Build muscle').click()
  await page.getByPlaceholder(/before my wedding/).fill('put on 15 lb')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '4 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByText('No weights').click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Start Week 1' }).click()
}

test('a closed week comes back as a review, and it asks for the photos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  // Sunday: the last day of the week, so one night takes us over the line.
  await page.clock.install({ time: new Date(2026, 7, 16, 9, 0) })
  await page.goto('./')
  await onboard(page)

  // Put something real in the week so there is a week to review.
  await page.getByRole('button', { name: /Browse workouts/ }).click()
  await page.getByText('No-Gear Burner').click()
  await page.getByRole('button', { name: 'Already did it' }).click()
  await page.getByRole('dialog', { name: 'Session debrief' }).getByRole('button', { name: 'Done' }).click()

  // Nothing has closed yet, so nothing is offered.
  await expect(page.getByText('Your week is in')).toHaveCount(0)

  // Monday morning. The week is over.
  await page.clock.fastForward('20:00:00')
  await expect(page.getByText('Your week is in')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Week of Aug 10')).toBeVisible()

  await page.getByRole('button', { name: 'See it', exact: true }).click()
  const story = page.getByRole('dialog', { name: /Week of Aug 10 review/ })
  await expect(story).toBeVisible()

  // Tap through the story to the standing photo ask.
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole('button', { name: /Take this week's photos/ }).isVisible()) break
    await story.click({ position: { x: 340, y: 400 } })
  }
  await expect(page.getByRole('button', { name: /Take this week's photos/ })).toBeVisible()

  // And it opens the real check-in, camera and all, not a sign pointing elsewhere.
  await page.getByRole('button', { name: /Take this week's photos/ }).click()
  await expect(page.getByRole('dialog', { name: 'Weekly check-in' })).toBeVisible()
  await expect(page.getByRole('button', { name: /front/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /side/ })).toBeVisible()
})

test('the review is offered once, and taken off the board when dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 16, 9, 0) })
  await page.goto('./')
  await onboard(page)

  await page.getByRole('button', { name: /Browse workouts/ }).click()
  await page.getByText('No-Gear Burner').click()
  await page.getByRole('button', { name: 'Already did it' }).click()
  await page.getByRole('dialog', { name: 'Session debrief' }).getByRole('button', { name: 'Done' }).click()

  await page.clock.fastForward('20:00:00')
  await expect(page.getByText('Your week is in')).toBeVisible({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Not now', exact: true }).click()
  await expect(page.getByText('Your week is in')).toHaveCount(0)

  // A reload must not bring it back: "seen" is written down, not remembered.
  await page.reload()
  await expect(page.getByText('Your week is in')).toHaveCount(0)
})

test('any period can be opened on demand, from Progress', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)

  await page.locator('button').filter({ hasText: /^Progress$/ }).last().click()
  await expect(page.getByText('Reviews', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /The quarter so far/ }).click()
  await expect(page.getByRole('dialog', { name: /Q3 2026 review/ })).toBeVisible()
})
