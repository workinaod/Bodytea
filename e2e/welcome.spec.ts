import { expect, test } from '@playwright/test'

// The welcome screen's whole argument is that the app takes ANY goal, and
// it makes that argument by letting you tap one rather than by claiming it.
// So the thing worth testing is that the tap is a real head start: the goal
// has to arrive already filled in, and the follow-ups have to be the ones
// that goal actually needs.

test('a welcome goal chip seeds the wizard with that goal', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await page.getByRole('button', { name: /Dunk a basketball/ }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()

  // Seeded in the user's own words, and editable
  await expect(page.getByPlaceholder(/dunk on a 10-ft rim/)).toHaveValue('dunk on a 10-ft rim')
  // The training category came with it, so the vertical follow-ups are here
  await expect(page.getByText('Where is your vertical now?')).toBeVisible()
})

test('a different chip seeds a completely different plan', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await page.getByRole('button', { name: /First marathon/ }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()

  await expect(page.getByPlaceholder(/dunk on a 10-ft rim/)).toHaveValue('finish my first marathon')
  // Endurance, not jumping: a different family of questions entirely
  await expect(page.getByText('Where is your vertical now?')).toHaveCount(0)
})
