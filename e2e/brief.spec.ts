import { expect, test, type Page } from '@playwright/test'

// ============================================================
// "What am I actually doing, and why?"
//
// The app explained every movement and never explained the
// session, and the one plan-level explainer it had was the
// owner's own booklet shown to everybody. These pin the three
// places that answer is now available, and pin that the answer
// belongs to the athlete asking it.
// ============================================================

async function onboard(page: Page, goal: string, statement: string) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText(goal).click()
  await page.getByPlaceholder(/before my wedding/).fill(statement)
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByText('Home gym').click()
  await page.getByText('Dumbbells', { exact: true }).click()
  await page.getByText('Flat bench').click()
  await page.getByText('Pull-up bar', { exact: true }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Start Week 1' }).click()
}

test("today's question mark explains the session, in the order it runs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await onboard(page, 'Jump higher', 'dunk on a 10-ft rim by June')

  await page.getByRole('button', { name: 'How this workout works' }).click()
  const sheet = page.getByRole('dialog').last()

  // Size, measured off the day on screen.
  await expect(sheet.getByText(/\d+ sets across \d+ movements, about \d+ min\./)).toBeVisible()
  // What it works, with counted sets rather than adjectives.
  await expect(sheet.getByText('What it works')).toBeVisible()
  await expect(sheet.getByText(/^\d+(\.5)? sets?$/).first()).toBeVisible()
  // The order, with the explosive band ahead of the lifts.
  await expect(sheet.getByText('The order, and why')).toBeVisible()
  await expect(sheet.getByText('Explosive work')).toBeVisible()
  await expect(sheet.getByText('Main lifts')).toBeVisible()
  // Where it sits: the week, the max-effort day, and their own words back.
  await expect(sheet.getByText(/Week 1 of the plan\. Block 1, week 1 of 4\./)).toBeVisible()
  await expect(sheet.getByText(/dunk on a 10-ft rim by June/)).toBeVisible()
})

test('a shelf workout says plainly that it is not from your plan', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page, 'Jump higher', 'by June')

  await page.getByRole('button', { name: /Different workout today\?/ }).click()
  await page.getByRole('button', { name: /Browse workouts/ }).click()
  await page.getByText('No-Gear Burner').click()
  await page.getByRole('button', { name: /How No-Gear Burner works/ }).click()

  const sheet = page.getByRole('dialog').last()
  await expect(sheet.getByText('What it works')).toBeVisible()
  await expect(sheet.getByText(/Not from your plan/)).toBeVisible()
  // No plan placement to claim, so it claims none.
  await expect(sheet.getByText(/Week \d+ of the plan/)).toHaveCount(0)
})

test('the plan reader describes YOUR plan, not the owner\'s booklet', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page, 'Lose weight', 'lose 30 lb by summer')

  await page.locator('button').filter({ hasText: /^Coach$/ }).last().click()
  await page.getByText('The Plan', { exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'The Plan' })

  // Their booklet, their words, their week.
  await expect(sheet.getByText(/lose 30 lb by summer/)).toBeVisible()
  await expect(sheet.getByText(/training days? a week/)).toBeVisible()
  await sheet.getByText('Your week, day by day').click()
  await expect(sheet.getByText('MON')).toBeVisible()

  // And NOT the owner's NAOD prose, which is what everybody used to get.
  await expect(sheet.getByText('The Penultimate Step')).toHaveCount(0)
  await expect(sheet.getByText(/dunk/i)).toHaveCount(0)
})
