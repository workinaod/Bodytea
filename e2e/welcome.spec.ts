import { test, expect } from '@playwright/test'

// ============================================================
// The way in, and what the goal decides.
//
// The landing used to carry its own short list of goals, which
// meant the app asked the same question twice with a worse list
// the first time. It is one door now, and the goal is chosen on
// the goal screen where all twelve live and the app already
// knows who it is talking to.
//
// What matters after that is that the goal actually decides the
// questions. These assert the goal, never a position in a grid:
// the seeding used to carry an INDEX, and reordering the grid
// silently pointed four of five landing buttons at the wrong
// plan without a single test going red.
// ============================================================

async function start(page: import('@playwright/test').Page, name = 'Sam') {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill(name)
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
}

test('one door in, and it opens on the person rather than the plan', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await expect(page.getByRole('heading', { name: /Tell us\s+your goals/ })).toBeVisible()

  // No goals on the landing at all: it says one thing and offers one way on.
  await expect(page.getByRole('button', { name: 'Lose weight' })).toHaveCount(0)

  await page.getByRole('button', { name: "Let's get started" }).click()
  await expect(page.getByRole('heading', { name: 'What should we call you?' })).toBeVisible()
})

test('the goal you pick decides which questions you get', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: 'Run further', exact: true }).click()
  await page.getByRole('button', { name: /Next: a few questions/ }).click()

  await expect(page.getByText('What are you training for?')).toBeVisible()
  await expect(page.getByText('How much bigger are you trying to get?')).toHaveCount(0)
})

test('a different goal is a different family of questions entirely', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: 'Build muscle', exact: true }).click()
  await page.getByRole('button', { name: /Next: a few questions/ }).click()

  await expect(page.getByText('How much bigger are you trying to get?')).toBeVisible()
  await expect(page.getByText('What are you training for?')).toHaveCount(0)
})

test('the coach asks which sport, which it never used to', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: 'Get better at my sport', exact: true }).click()
  await page.getByRole('button', { name: /Next: a few questions/ }).click()

  await expect(page.getByText('What do you play?')).toBeVisible()

  // And the position question only exists once there is a sport that
  // has positions worth asking about.
  await expect(page.getByText('What position?')).toHaveCount(0)
  await page.getByRole('button', { name: 'Basketball', exact: true }).click()
  await expect(page.getByText('What position?')).toBeVisible()
})

test('the dunk goal is offered by height, and only by height', async ({ page }) => {
  // A rim is 120 inches off the floor whoever is looking at it. At 5'10"
  // that is a reachable vertical; at 5'2" it is 36 inches, which is a
  // promise the app cannot keep. It is never a lock — the typed box
  // still builds the same jump plan for anyone who asks for it.
  await start(page) // 5'10"
  await expect(page.getByRole('button', { name: 'Dunk a basketball' })).toBeVisible()

  await page.getByRole('button', { name: '← Back' }).click()
  await page.getByLabel('Height').fill('52')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await expect(page.getByRole('button', { name: 'Dunk a basketball' })).toHaveCount(0)
})
