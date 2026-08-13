import { test, expect } from '@playwright/test'

// ============================================================
// The first tap has to be a real head start.
//
// A goal chosen on the welcome screen must arrive at the goal
// step already chosen, in the user's own words — and the coach's
// questions that follow have to be the ones THAT goal needs.
//
// The seeding used to carry an INDEX into the chip grid rather
// than the goal itself, so reordering that grid silently pointed
// four of the five landing buttons at the wrong plan. These
// assert the goal, not the position.
// ============================================================

test('a welcome goal chip seeds the wizard with that goal', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await page.getByRole('button', { name: /Run a 5K/ }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()

  // The goal came with it, so the chip is already chosen and the
  // detail box — not the from-scratch box — is what is offered.
  await expect(page.getByText("Let's get specific")).toBeVisible()
  await page.getByRole('button', { name: /Next/ }).click()

  // Running questions, because that is the goal that was tapped. Note
  // it does NOT ask which distance: the seeded sentence already says
  // 5K, and asking again would prove nothing was read.
  // The distance question is GONE — the seeded sentence already says
  // 5K, and asking again would prove nothing was read. What it opens
  // with is the next thing it does not know.
  await expect(page.getByText('What are you training for?')).toHaveCount(0)
  await expect(page.getByText('When is it?')).toBeVisible()
})

test('a different chip seeds a completely different plan', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await page.getByRole('button', { name: /Build muscle/ }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByRole('button', { name: /Next/ }).click()

  // A different family of questions entirely.
  await expect(page.getByText('How much bigger are you trying to get?')).toBeVisible()
  await expect(page.getByText('When is it?')).toHaveCount(0)
})

test('the coach asks which sport, which it never used to', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await page.getByRole('button', { name: 'Something else' }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: /Next/ }).click()
  await page.getByText('Get better at my sport').click()
  await page.getByRole('button', { name: /Next/ }).click()

  await expect(page.getByText('What do you play?')).toBeVisible()

  // And the position question only exists once there is a sport that
  // has positions worth asking about.
  await expect(page.getByText('What position?')).toHaveCount(0)
  await page.getByText('Basketball', { exact: true }).click()
  await expect(page.getByText('What position?')).toBeVisible()
})
