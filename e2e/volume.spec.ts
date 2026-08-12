import { test, expect } from '@playwright/test'
import { emptyAppData, defaultWeekState } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// The owner got 11 sets into the Tuesday push day with cooked
// shoulders and 12 sets still in front of them. Counted per
// exercise it is seven reasonable movements. Counted per muscle
// it is 11.5 sets on the triceps and 10.5 on the front delts,
// because every press pays both whether or not they are the
// point of the movement.
//
// This drives the whole fix through the real UI: the warning
// appears BEFORE the session, the numbers are the real ones,
// and arming the trim changes the preview list rather than just
// promising something at start time.
// ============================================================

// The phase starts ON the Tuesday, so no earlier day is missing and
// the reconcile sheet (correctly, and locked) stays shut.
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

test('a volume-heavy day says so before you start, and the trim is a tap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), seed())
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)

  const notice = page.getByText('Heavy day', { exact: true }).locator('xpath=../..')
  await expect(notice).toBeVisible()
  // The real numbers, not a vague "this is a lot".
  await expect(notice).toContainText('23 sets')
  await expect(notice).toContainText('11.5 of them land on your triceps')
  await expect(notice).toContainText('10.5 of them land on your front delts')
  // And the ordering problem, which is why the last OHP set dropped 5 lb.
  await expect(notice).toContainText('after 8.5 sets of triceps work')

  // Scoped to the preview rows: the notice names these movements too,
  // and matching its prose instead of the list would prove nothing.
  const row = (name: string) =>
    page.getByText(name, { exact: true }).locator('xpath=ancestor::div[2]')

  // Nothing has moved yet: suggest first, act on a tap.
  await expect(row('Overhead Tricep Extension')).toBeVisible()

  await page.getByRole('button', { name: 'Trim to 18 sets' }).click()
  await page.clock.runFor(400)

  const trimmed = page.getByText('Trimmed', { exact: true }).locator('xpath=../..')
  await expect(trimmed).toContainText('18 sets')
  await expect(trimmed).toContainText('Overhead Tricep Extension is out')

  // The preview must agree with the notice, or the notice is a lie.
  await expect(page.getByText('Overhead Tricep Extension', { exact: true })).toHaveCount(0)
  await expect(row('Standing Barbell OHP')).toContainText('3 × 6-10')

  // And it is reversible, because it is a suggestion.
  await page.getByRole('button', { name: 'no, give me all 23' }).click()
  await page.clock.runFor(400)
  await expect(row('Overhead Tricep Extension')).toBeVisible()
  await expect(row('Standing Barbell OHP')).toContainText('4 × 6-10')
})
