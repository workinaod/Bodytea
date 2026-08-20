import { test, expect } from '@playwright/test'
import { emptyAppData, defaultWeekState } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// The owner got 11 sets into the Tuesday push day with cooked
// shoulders and 12 sets still in front of them. Counted per
// exercise it is seven reasonable movements. Counted per muscle
// it was 11.5 sets on the triceps and 10.5 on the front delts,
// neither of which the day was built for.
//
// The resolver caps that now, so the fix is not a prompt: the
// day you open is already the day worth doing. This checks the
// capped day reaches the screen, and that the app says why.
// ============================================================

// The phase starts ON the Tuesday, so no earlier day is missing and the
// (correctly locked) reconcile sheet stays shut.
const TUESDAY = '2026-08-11'
const MONDAY = '2026-08-10'

function seed(): string {
  const d = emptyAppData(TUESDAY, TUESDAY)
  d.settings.onboarded = true
  const week = defaultWeekState(MONDAY)
  week.tier = 1 // the full plan, the one the owner trains
  week.tierPickedAt = `${MONDAY}T08:00:00.000Z`
  d.weeks[MONDAY] = week
  return JSON.stringify(buildEnvelope(d))
}

test('the push day arrives already trimmed, and says why', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), seed())
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)

  await expect(page.getByText('Push + Shoulder Health')).toBeVisible()

  // Plain words, and it names what went and why.
  const banner = page.getByText(/Trimmed to keep this day useful/)
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Overhead Tricep Extension')

  // The prescription lives in the row's leading coin now (sets x reps, no
  // spaces, so it fits a 40px square), so the row is two levels further
  // up than it used to be.
  const row = (name: string) =>
    page.getByText(name, { exact: true }).locator('xpath=ancestor::div[3]')

  // The collateral arm work is gone and the OHP lost a set...
  await expect(page.getByText('Overhead Tricep Extension', { exact: true })).toHaveCount(0)
  await expect(row('Standing Barbell OHP')).toContainText('3×6')
  await expect(row('Close-Grip Bench / Floor Press')).toContainText('2×8')

  // Never a range. Users do not pick reps, so they are never shown a
  // menu: every prescription on the page is one number.
  await expect(page.getByText(/\d+\s*[-–]\s*\d+\s*(reps)?$/)).toHaveCount(0)

  // ...but the day is still the day: both presses survive untouched.
  await expect(row('Incline DB Press')).toContainText('4×8')
  await expect(row('Flat DB Press')).toContainText('3×8')
})

test('a day that needed no trimming says nothing about it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), seed())
  // Wednesday: a lower day whose glute work is the whole point.
  await page.clock.install({ time: new Date(2026, 7, 12, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)

  await expect(page.getByText(/Trimmed to keep this day useful/)).toHaveCount(0)
  await expect(page.getByText(/Trimmed a few sets/)).toHaveCount(0)
})
