import { expect, test, type Page } from '@playwright/test'

// Booklet flows: bring-your-own-routine and fine-tune-the-generated-booklet.
test.describe.configure({ mode: 'serial' })

/** Shared wizard head: welcome → name → goal. */
async function throughGoal(page: Page, entry: string, chip: string, statement: string) {
  await page.getByRole('button', { name: entry }).click()
  await page.getByRole('button', { name: 'Next — the goal' }).click()
  await page.getByText(chip).click()
  await page.getByPlaceholder(/dunk on a 10-ft rim/).fill(statement)
}

test('bring your own routine: build week → notes → track it', async ({ page }) => {
  // Monday Aug 10 2026 — the built day lands on "today"
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await throughGoal(page, 'I already have a routine', '💪 Build muscle', 'add 10 lb of lean muscle')
  await page.getByRole('button', { name: 'Next — my numbers' }).click()
  await page.getByRole('button', { name: 'Next — build my week' }).click()

  // Empty week fails validation with a clear message
  await expect(page.getByRole('heading', { name: 'Build your week' })).toBeVisible()
  await page.getByRole('button', { name: 'Done — give me the notes' }).click()
  await expect(page.getByText('Add at least one training day to the week.')).toBeVisible()

  // Assemble Monday from the 77-exercise picker
  await page.getByRole('button', { name: '+ add a training day' }).first().click()
  await expect(page.getByText('Edit day')).toBeVisible()
  await page.getByRole('textbox').first().fill('Full Body A')
  for (const [query, name] of [
    ['Goblet', 'Goblet Squat'],
    ['Romanian', 'DB Romanian Deadlift'],
    ['One-Arm', 'One-Arm DB Row'],
  ] as const) {
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder(/Search by name or muscle/).fill(query)
    await page.getByRole('button', { name: new RegExp(name) }).first().click()
  }
  await page.getByRole('button', { name: 'Done with this day' }).click()
  await expect(page.getByText('Full Body A')).toBeVisible()
  await expect(page.getByText('3 exercises')).toBeVisible()

  // Notes: honest read on the routine
  await page.getByRole('button', { name: 'Done — give me the notes' }).click()
  await expect(page.getByRole('heading', { name: 'Straight notes, no fluff' })).toBeVisible()
  await expect(page.getByText(/posterior chain gets its work/)).toBeVisible()
  await expect(page.getByText(/automatic deload/)).toBeVisible()

  await page.getByRole('button', { name: "Start Week 1 — let's work" }).click()

  // Today runs THEIR routine
  await expect(page.getByText(/Week 1/).first()).toBeVisible()
  await expect(page.getByText('Full Body A').first()).toBeVisible()

  // Notes landed in the coach feed, and My Booklet opens for later edits
  await page.getByRole('button', { name: 'Coach', exact: true }).click()
  await expect(page.getByText(/Routine notes:/).first()).toBeVisible()
  await page.getByText(/My Booklet — My Routine/).click()
  await expect(page.getByRole('heading', { name: 'My Booklet' })).toBeVisible()
  await expect(page.getByText('Full Body A')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'My Booklet' })).not.toBeVisible()
})

test('generated booklet: fine-tune before starting', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await throughGoal(page, 'Build my plan', '🏀 Dunk a basketball', 'dunk on a 10-ft rim by June')
  await page.getByRole('button', { name: 'Next — my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next — my gear' }).click()
  await page.getByRole('button', { name: 'Next — experience' }).click()
  await page.getByRole('button', { name: 'Next — numbers' }).click()
  await page.getByRole('button', { name: 'Generate my booklet' }).click()
  await expect(page.getByText('Vertical Project — 6-Day')).toBeVisible()

  await page.getByRole('button', { name: /Fine-tune it first/ }).click()
  await expect(page.getByRole('heading', { name: 'Fine-tune your booklet' })).toBeVisible()

  // Rename the booklet, then lock it in
  const nameInput = page.getByRole('textbox').first()
  await expect(nameInput).toHaveValue('Vertical Project — 6-Day')
  await nameInput.fill('My Dunk Plan')
  await page.getByRole('button', { name: 'Lock it in — start Week 1' }).click()

  await expect(page.getByText(/Week 1/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Coach', exact: true }).click()
  await expect(page.getByText(/My Booklet — My Dunk Plan/)).toBeVisible()
})
