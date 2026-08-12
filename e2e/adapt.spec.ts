import { test, expect } from '@playwright/test'
import { defaultWeekState, emptyAppData } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// The point of the adaptation engine is that it reaches the
// athlete without being asked. A pure function with good unit
// tests that nothing calls adapts precisely nothing, so this
// checks the whole path: something happened, the resolver read
// it, and the session on screen is different because of it.
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

async function boot(page: import('@playwright/test').Page, state: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), state)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
}

test('a normal week is left completely alone', async ({ page }) => {
  await boot(page, seed(() => {}))
  await expect(page.getByText('Push + Shoulder Health')).toBeVisible()
  // No adaptation banner, because nothing has happened worth adapting to.
  await expect(page.getByText(/swapped today|has been complaining|No .* today, so this/)).toHaveCount(0)
})

test('losing the gym rewrites the day and says what is missing', async ({ page }) => {
  const state = seed((d) => {
    // Away for the week: dumbbells and a bench, nothing else.
    d.plan.equipment = ['dumbbell', 'bench']
  })
  await boot(page, state)

  // The session is still there and still the same day, just doable.
  await expect(page.getByText('Push + Shoulder Health')).toBeVisible()
  await expect(page.getByText(/so this is the same movement with what you have/)).toBeVisible()
})

test('a shoulder flagged twice reroutes the pressing, without being asked', async ({ page }) => {
  const state = seed((d) => {
    for (const date of ['2026-08-08', '2026-08-09']) {
      d.sessions[date] = {
        date,
        templateId: 'tuesday',
        status: 'completed',
        exercises: [],
        fatigue: [{ exerciseId: 'incline-db-press', reason: 'pain', atSetIdx: 1, regions: ['chest'] }],
      }
    }
  })
  await boot(page, state)

  await expect(page.getByText(/shoulder has been complaining/)).toBeVisible()
})

test('one complaint is not enough to rewrite anybody\'s plan', async ({ page }) => {
  const state = seed((d) => {
    d.sessions['2026-08-09'] = {
      date: '2026-08-09',
      templateId: 'tuesday',
      status: 'completed',
      exercises: [],
      fatigue: [{ exerciseId: 'incline-db-press', reason: 'pain', atSetIdx: 1, regions: ['chest'] }],
    }
  })
  await boot(page, state)
  await expect(page.getByText(/shoulder has been complaining/)).toHaveCount(0)
})
