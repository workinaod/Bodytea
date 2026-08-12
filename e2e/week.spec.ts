import { test, expect } from '@playwright/test'
import { defaultWeekState, emptyAppData } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// The week's day sheet was a schedule. Once a day is behind you
// the interesting question stops being what you were meant to do
// and becomes what you did, and the gap between them is the only
// thing either number is really for.
// ============================================================

const TUESDAY = '2026-08-11'
const MONDAY = '2026-08-10'

function seed(mutate: (d: ReturnType<typeof emptyAppData>) => void): string {
  const d = emptyAppData(TUESDAY, TUESDAY)
  d.settings.onboarded = true
  const week = defaultWeekState(MONDAY)
  week.tier = 1
  week.tierPickedAt = `${MONDAY}T08:00:00.000Z`
  d.weeks[MONDAY] = week
  mutate(d)
  return JSON.stringify(buildEnvelope(d))
}

async function openDay(page: import('@playwright/test').Page, state: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), state)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await page.getByText('Push + Shoulder Health').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

test('an untrained day shows the plan and claims nothing', async ({ page }) => {
  await openDay(page, seed(() => {}))
  const sheet = page.getByRole('dialog')
  await expect(sheet).toContainText('Incline DB Press')
  await expect(sheet).not.toContainText('not done')
  await expect(sheet).toContainText(/\d+ sets/)
})

test('a trained day shows what was actually done under each movement', async ({ page }) => {
  const state = seed((d) => {
    d.sessions[TUESDAY] = {
      date: TUESDAY,
      templateId: 'tuesday',
      status: 'completed',
      exercises: [
        {
          exerciseId: 'incline-db-press',
          sets: [
            { targetReps: '8', reps: 8, weightLb: 55, done: true },
            { targetReps: '8', reps: 6, weightLb: 55, done: true },
          ],
        },
      ],
    }
  })
  await openDay(page, state)
  const sheet = page.getByRole('dialog')
  // The uneven set spelled out rather than collapsed: 8 then 6 is the
  // interesting session, not "2 × 8".
  await expect(sheet).toContainText('8, 6 · 55 lb')
  // And everything planned that never happened is still on the list.
  await expect(sheet.getByText('not done').first()).toBeVisible()
  await expect(sheet).toContainText(/of \d+ sets done/)
})

test("the day's cardio numbers ride at the bottom", async ({ page }) => {
  const state = seed((d) => {
    d.cardio[TUESDAY] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 90, kcalEst: 700, at: `${TUESDAY}T20:00:00.000Z` },
    ] as never
  })
  await openDay(page, state)
  const sheet = page.getByRole('dialog')
  await expect(sheet).toContainText('Basketball')
  await expect(sheet).toContainText('1h 30m')
})

test('the redundant note is gone', async ({ page }) => {
  await openDay(page, seed(() => {}))
  await expect(page.getByRole('dialog')).not.toContainText('Incline first every week')
})
