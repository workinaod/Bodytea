import { test, expect } from '@playwright/test'
import { defaultWeekState, emptyAppData, type AppData } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// The long grind, given a road.
//
// The complaint this answers is emotional, so the assertions
// are about what a person can actually see: is there a route,
// is it obvious where they are standing on it, does it end
// somewhere, and does the app admit when it does not know how
// long a leg will take.
// ============================================================

const TODAY = '2026-08-14'
const MONDAY = '2026-08-10'

function seed(mutate: (d: AppData) => void): string {
  const d = emptyAppData('2026-01-05', TODAY)
  d.settings.onboarded = true
  const week = defaultWeekState(MONDAY)
  week.tier = 1
  week.tierPickedAt = `${MONDAY}T08:00:00.000Z`
  d.weeks[MONDAY] = week
  mutate(d)
  return JSON.stringify(buildEnvelope(d))
}

const trained = (d: AppData) => {
  for (let i = 1; i <= 12; i++) {
    const date = `2026-07-${String(i).padStart(2, '0')}`
    d.sessions[date] = {
      date,
      templateId: 'monday',
      status: 'completed',
      exercises: [{ exerciseId: 'front-squat', sets: [{ targetReps: '5', weightLb: 150, reps: 5, done: true }] }],
    }
  }
}

async function openProgress(page: import('@playwright/test').Page, state: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), state)
  await page.clock.install({ time: new Date(2026, 7, 14, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByText('The climb')).toBeVisible()
}

test('a brand-new account still gets a road, not an empty promise', async ({ page }) => {
  // Day one is not "come back in a month": the consistency track needs
  // no measurement of any kind to put real stops on the path.
  await openProgress(page, seed(() => {}))
  await expect(page.getByText('HERE')).toBeVisible()
  await expect(page.getByText(/\d+ sessions/).first()).toBeVisible()
})

test('exactly one stop says HERE, however many tracks are running', async ({ page }) => {
  // A road has one position on it. `next` is per-track, so the
  // unfiltered path had three of them shouting at once, which is no
  // position at all.
  await openProgress(page, seed(trained))
  await expect(page.getByText('HERE')).toHaveCount(1)
})

test('the stop you are standing at is named, with the kind of estimate', async ({ page }) => {
  await openProgress(page, seed(trained))
  await expect(page.getByText(/^Next up/)).toBeVisible()
  await expect(page.getByText(/at your rate|typical for your level/).first()).toBeVisible()
})

test('the road behind you is on the same screen as the road ahead', async ({ page }) => {
  await openProgress(page, seed(trained))
  // Ten sessions is behind them and stays on the path as a ticked stop.
  await expect(page.getByText('10 sessions')).toBeVisible()
  await expect(page.getByText('✓').first()).toBeVisible()
})

test('tapping a stop opens what it actually takes', async ({ page }) => {
  // A node has room for a name and a date. Everything that makes the
  // target honest lives one tap in.
  await openProgress(page, seed(trained))
  await page.getByRole('button', { name: /25 sessions/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByText('Work in the bank, whatever the scale says.')).toBeVisible()
})

test('an opened stop says where its date came from', async ({ page }) => {
  await openProgress(page, seed(trained))
  await page.getByRole('button', { name: /50 sessions/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByText(/how fast YOU have actually been moving|typical rate for your training age/)).toBeVisible()
})

test('it says the targets do not move, because that is the whole contract', async ({ page }) => {
  await openProgress(page, seed(() => {}))
  await expect(page.getByText(/Targets never move/)).toBeVisible()
})

test('a stop with nothing behind it opens the check-in that would anchor it', async ({ page }) => {
  await openProgress(
    page,
    seed((d) => {
      d.plan.goal = 'lean'
      d.plan.trackedLifts = []
    }),
  )
  await page.getByRole('button', { name: /Your body track/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('the track filter keeps one stalled number from greying the road', async ({ page }) => {
  await openProgress(page, seed(trained))
  await page.getByRole('button', { name: 'Consistency', exact: true }).click()
  await expect(page.getByText(/\d+ sessions/).first()).toBeVisible()
  await expect(page.getByText('HERE')).toHaveCount(1)
})
