import { test, expect } from '@playwright/test'
import { defaultWeekState, emptyAppData, type AppData } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// The long grind, given stages.
//
// The complaint this answers is emotional, so the assertions are
// about what a person can actually see: is there a next thing, is
// there a last thing, and does the app admit when it does not
// know how long something will take.
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

async function openProgress(page: import('@playwright/test').Page, state: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), state)
  await page.clock.install({ time: new Date(2026, 7, 14, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByText('The climb')).toBeVisible()
}

test('a brand-new account still gets stages, not an empty promise', async ({ page }) => {
  // The whole point is that day one is not "come back in a month".
  await openProgress(page, seed(() => {}))
  await expect(page.getByText('you are here')).toBeVisible()
  await expect(page.getByText(/\d+ sessions/).first()).toBeVisible()
})

test('the next rung carries an estimate and says what kind it is', async ({ page }) => {
  await openProgress(page, seed(() => {}))
  // Six words that keep an estimate an estimate.
  await expect(page.getByText(/typical for your level|from your rate/).first()).toBeVisible()
})

test('what is behind you stacks above the line, with the date', async ({ page }) => {
  await openProgress(
    page,
    seed((d) => {
      for (let i = 1; i <= 12; i++) {
        const date = `2026-07-${String(i).padStart(2, '0')}`
        d.sessions[date] = {
          date,
          templateId: 'monday',
          status: 'completed',
          exercises: [{ exerciseId: 'front-squat', sets: [{ targetReps: '5', weightLb: 150, reps: 5, done: true }] }],
        }
      }
    }),
  )
  // Ten sessions is behind them, and it reads as behind them.
  await expect(page.getByText('10 sessions')).toBeVisible()
  await expect(page.getByText(/✓/).first()).toBeVisible()
})

test('it says the targets do not move, because that is the whole contract', async ({ page }) => {
  await openProgress(page, seed(() => {}))
  await expect(page.getByText(/Targets never move/)).toBeVisible()
})

test('a locked track names the one thing that would start it', async ({ page }) => {
  await openProgress(
    page,
    seed((d) => {
      d.plan.goal = 'lean'
      d.plan.trackedLifts = []
    }),
  )
  // Not a grey row that explains nothing: the exact action, tappable.
  await expect(page.getByText(/Log a weigh-in to start this one/)).toBeVisible()
})

test('tapping the blocker opens the check-in that would anchor it', async ({ page }) => {
  await openProgress(
    page,
    seed((d) => {
      d.plan.goal = 'lean'
      d.plan.trackedLifts = []
    }),
  )
  await page.getByText(/Log a weigh-in to start this one/).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('the track filter keeps one stalled number from greying the board', async ({ page }) => {
  await openProgress(page, seed(() => {}))
  await expect(page.getByRole('button', { name: 'Consistency', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Consistency', exact: true }).click()
  await expect(page.getByText(/\d+ sessions/).first()).toBeVisible()
})
