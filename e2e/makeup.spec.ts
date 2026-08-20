import { expect, test, type Page } from '@playwright/test'
import { finishToDebrief } from './util'

// ============================================================
// A make-up must not eat the day it runs on.
//
// Reported from the live app: Monday's missed workout was run on
// a later day, finished, and that day then read "Full session on
// a downgraded day. Honestly logged." over a scheduled workout
// nobody had touched. Today only offered Start while the day had
// no session at all, so the day's own workout was not merely
// mislabelled, it was unreachable.
// ============================================================

async function onboardGenerated(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('Jump higher').click()
  await page.getByPlaceholder(/before my wedding/).fill('by June')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByText('Home gym').click()
  await expect(page.getByText('Tick what you own')).toBeVisible()
  await page.getByText('Dumbbells', { exact: true }).click()
  await page.getByText('Flat bench').click()
  await page.getByText('Pull-up bar', { exact: true }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Start Week 1' }).click()
}

test("a make-up leaves today's own session on the table", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  // Wednesday evening; let it slip past the 3 AM window into Thursday.
  await page.clock.install({ time: new Date(2026, 7, 12, 23, 58) })
  await page.goto('./')
  await onboardGenerated(page)
  await expect(page.getByText('Lower Strength', { exact: true })).toBeVisible()

  await page.clock.fastForward('00:05:00')
  await page.clock.fastForward('03:10:00')
  await expect(page.getByText('Mobility + Active Recovery')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/unaccounted for/)).toBeVisible()
  await page.getByText('Tired', { exact: true }).click()
  await page.getByRole('button', { name: 'Skipped, no proof' }).click()

  // Thursday has its own mobility work. Run Wednesday's missed lower day instead.
  await page.getByRole('button', { name: /Training something else today/ }).click()
  await page.getByRole('button', { name: /Run a previous day/ }).click()
  await page.getByRole('button', { name: /Lower Strength/ }).click()
  await expect(page.getByText('How much do you have today?')).toBeVisible()
  await page.getByRole('button', { name: /^Full session/ }).click()
  await expect(page.getByRole('heading', { name: 'Lower Strength' })).toBeVisible()

  // Finish it without doing everything, the way a real day ends. The
  // focus runner opens by default and owns the screen; the list is where
  // the finish button lives.
  await page.getByRole('button', { name: /☰ list/ }).click()
  // One real set, so the day records as trained rather than skipped.
  await page.getByRole('button', { name: '✓', exact: true }).first().click()
  await page.getByRole('button', { name: /Finish session/ }).click()
  const gate = page.getByRole('dialog', { name: 'End session?' })
  await expect(gate).toBeVisible()
  await gate.getByRole('button').last().click()

  // Finishing plays the ceremony before the debrief; it waits on Continue.
  await finishToDebrief(page)
  await page
    .getByRole('dialog', { name: 'Session debrief' })
    .getByRole('button', { name: 'Done', exact: true })
    .click()

  // THE BUG: from here the day read as done and Thursday's own work was gone.
  // Nothing on this screen may claim the day is finished.
  await expect(page.getByText('Today is not done.')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Session complete.')).toHaveCount(0)
  await expect(page.getByText(/still on the table/)).toBeVisible()

  // Thursday's own workout is named, and startable.
  const start = page.getByRole('button', { name: /Start today's session|Readiness check/ })
  await expect(start).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mobility + Active Recovery' })).toBeVisible()

  // And the workout itself is listed again, not just promised by a button.
  // The list used to vanish the moment any session existed, which left a
  // Start button over an empty screen.
  await expect(page.getByRole('button', { name: /^Swap / }).first()).toBeVisible()

  // And the button does what it says: the day is running again, on today's
  // own workout, with the make-up's work still on the record beside it.
  await start.click()
  const full = page.getByRole('button', { name: /^Full session/ })
  if (await full.isVisible().catch(() => false)) await full.click()
  await expect(page.getByRole('button', { name: /Finish session|☰ list/ }).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Mobility + Active Recovery' })).toBeVisible()
})
