import { expect, test, type Page } from '@playwright/test'

// ============================================================
// A finished session must not close the day out.
//
// Reported from the live app: logging an extra workout ended
// the day. Worse, underneath it, the extra workout ASSIGNED
// over the day's session, so the planned work logged earlier
// was destroyed. A day is a record of everything done in it.
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

test('extra work adds to a finished day instead of ending it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await onboard(page)

  // Log a shelf workout after the fact: the day now has a session.
  await page.getByRole('button', { name: /Training something else today/ }).click()
  await page.getByRole('button', { name: /Browse workouts/ }).click()
  await page.getByText('No-Gear Burner').click()
  await page.getByRole('button', { name: 'Already did it' }).click()
  await page.getByRole('dialog', { name: 'Session debrief' }).getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Session complete.')).toBeVisible()

  // THE BUG: the day used to be closed here, with nowhere to put
  // anything else. The door is still open.
  const addMore = page.getByRole('button', { name: /Did something else too/ })
  await expect(addMore).toBeVisible()
  await addMore.click()
  await expect(page.getByText(/does not replace what you already logged/)).toBeVisible()

  // Add a second workout, and the first one's work must survive.
  await page.getByRole('button', { name: /Your own workout/ }).click()
  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page
    .getByRole('dialog', { name: 'Pick an exercise' })
    .getByText('Bird Dog', { exact: true })
    .click()
  await page.getByRole('button', { name: 'Already did it' }).click()
  await page.getByRole('dialog', { name: 'Session debrief' }).getByRole('button', { name: 'Done' }).click()

  // Both workouts are on the day: check the Week tab's day sheet, which
  // reads the session log rather than the screen that wrote it.
  await page.locator('button').filter({ hasText: /^Week$/ }).last().click()
  await page.getByText('Mon', { exact: true }).first().click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText(/Push-Up/).first()).toBeVisible()
  await expect(sheet.getByText(/Bird Dog/)).toBeVisible()
  // Both totals on one day: more work than the plan asked, said plainly.
  await expect(sheet.getByText(/past the plan/)).toBeVisible()
})
