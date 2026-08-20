import { expect, test, type Page } from '@playwright/test'
import { trainTab } from './util'

// ============================================================
// Training the plan didn't schedule: build your own workout,
// run one off the general shelf, and make up a missed day
// picked from the recent past. Each path must land as a real
// session (live or logged), because that's the whole promise.
// ============================================================

/** Same generator walk as smoke: vertical goal, 6 days, DBs + bench + bar. */
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
  await page.getByRole('button', { name: "Start Week 1" }).click()
}

const offPlanButton = (page: Page) => trainTab(page)

test('build your own workout and run it live', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await onboardGenerated(page)

  // Train opens by pointing back at the plan: this tab is the alternative.
  await offPlanButton(page).click()
  await expect(page.getByText("Today's session")).toBeVisible()
  await page.getByRole('button', { name: /Your own workout/ }).click()

  // Pick a movement off the full catalog.
  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page.getByPlaceholder(/Search a name, a muscle/).fill('push-up')
  await page.getByText('Push-Up', { exact: true }).first().click()

  // The row lands with a dose already set; name it and go.
  await expect(page.getByText('Push-Up', { exact: true })).toBeVisible()
  await page.getByPlaceholder(/Name it \(optional\)/).fill('Garage pump')
  await page.getByRole('button', { name: 'Start it now' }).click()

  // The workout IS the day now: its name in the hero, the session live.
  await expect(page.getByRole('heading', { name: 'Garage pump' })).toBeVisible()
  await expect(page.getByText('Off the plan, on the record.')).toBeVisible()
})

test('the workouts shelf logs one after the fact, straight through the debrief', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await onboardGenerated(page)

  await offPlanButton(page).click()
  await page.getByRole('button', { name: /Browse workouts/ }).click()

  // The shelf is scrollable and fitted to this athlete's gear.
  await expect(page.getByText('No-Gear Burner')).toBeVisible()
  await page.getByText('No-Gear Burner').click()
  await expect(page.getByText('Nothing but a floor. Still a real session.')).toBeVisible()
  await page.getByRole('button', { name: 'Already did it' }).click()

  // Logged and finished: the debrief opens, titled by the workout.
  const debrief = page.getByRole('dialog', { name: 'Session debrief' })
  await expect(debrief).toBeVisible()
  await expect(debrief.getByText(/No-Gear Burner/)).toBeVisible()
  await debrief.getByRole('button', { name: 'Done', exact: true }).click()

  // The day now carries a completed session.
  await expect(page.getByText('Session complete.')).toBeVisible()
})

test('a missed day gets made up from the recent-days shelf', async ({ page }) => {
  // Wednesday evening; let it slip past the 3 AM window into Thursday.
  await page.clock.install({ time: new Date(2026, 7, 12, 23, 58) })
  await page.goto('./')
  await onboardGenerated(page)
  await expect(page.getByText('Lower Strength', { exact: true })).toBeVisible()

  await page.clock.fastForward('00:05:00')
  await page.clock.fastForward('03:10:00')
  await expect(page.getByText('Mobility + Active Recovery')).toBeVisible({ timeout: 10_000 })

  // The reconcile gate demands an answer for Wednesday: skipped, no proof.
  await expect(page.getByText(/unaccounted for/)).toBeVisible()
  await page.getByText('Tired', { exact: true }).click()
  await page.getByRole('button', { name: 'Skipped, no proof' }).click()

  // Thursday is mobility; the missed lower day is still winnable.
  await offPlanButton(page).click()
  await page.getByRole('button', { name: /Run a previous day/ }).click()
  await expect(page.getByText('skipped', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Lower Strength/ }).click()

  // Ordinary start gate, then the missed day's workout runs today.
  await expect(page.getByText('How much do you have today?')).toBeVisible()
  await page.getByRole('button', { name: /^Full session/ }).click()
  await expect(page.getByRole('heading', { name: 'Lower Strength' })).toBeVisible()
})
