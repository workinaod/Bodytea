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

test('a proposal is offered, taken, and actually changes the day', async ({ page }) => {
  const state = seed((d) => {
    // Two bad nights AND two unplanned hours of sport: the combination
    // that earns both offers.
    d.weeks['2026-08-10'].badSleepDates = ['2026-08-08', '2026-08-10']
    d.cardio['2026-08-10'] = [
      { id: 'c1', activityId: 'basketball', label: 'Basketball', when: 'solo', minutes: 120, at: '2026-08-10T20:00:00.000Z' },
    ] as never
  })
  await boot(page, state)

  // Offered, not applied.
  const offer = page.getByText('A set off each lift', { exact: true })
  await expect(offer).toBeVisible()
  await expect(page.getByText(/because you asked for it/)).toHaveCount(0)

  // Scoped to the card, not `.last()`. There are two offers on screen and
  // which one is second is a layout detail the test should not depend on.
  const card = page.locator('div').filter({ hasText: /^A set off each lift/ }).last()
  await card.getByRole('button', { name: 'Do that' }).click()

  // Taken: the day says so, and the offer flips to an undo. Re-queried
  // rather than reusing `card`, because accepting prefixes the title with
  // a tick and the original locator no longer matches.
  await expect(page.getByText(/because you asked for it/)).toBeVisible()
  await expect(page.getByText('✓ A set off each lift', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Never mind/ })).toHaveCount(1)
})

test('short sleep offers fewer SETS, never a day off', async ({ page }) => {
  // The correction: sleep loss spares maximal strength and costs repeated
  // effort, so the sets give and the weight stays. "Hold the weights
  // today" also read as "hold OFF on the weights today" to a real person
  // looking at the card, which is a title that WILL be misread.
  const state = seed((d) => {
    d.weeks['2026-08-10'].badSleepDates = ['2026-08-08', '2026-08-10']
  })
  await boot(page, state)
  await expect(page.getByText('A set off each lift', { exact: true })).toBeVisible()
  await expect(page.getByText(/same weight on the bar/)).toBeVisible()
  await expect(page.getByText(/Hold the weights/)).toHaveCount(0)
  await expect(page.getByText(/rest day|skip|take today off/i)).toHaveCount(0)
})

test('declining leaves no trace', async ({ page }) => {
  const state = seed((d) => {
    d.weeks['2026-08-10'].badSleepDates = ['2026-08-08', '2026-08-10']
  })
  await boot(page, state)

  await expect(page.getByText('A set off each lift', { exact: true })).toBeVisible()
  // Ignore it entirely and move on. Nothing about the session changed.
  await expect(page.getByText(/because you asked for it/)).toHaveCount(0)
})

test('two nights running is cut once, not twice', async ({ page }) => {
  // The resolver takes a third off automatically after two consecutive bad
  // nights. Offering "a set off each lift" on top of that is two
  // reductions for one night's sleep, which is what adapt.ts has always
  // said must not happen and what the proposals screen did anyway: it
  // built its own context and left the guard field out.
  const state = seed((d) => {
    d.weeks['2026-08-10'].badSleepDates = ['2026-08-09', '2026-08-10']
  })
  await boot(page, state)
  await expect(page.getByText(/volume cut by a third/)).toBeVisible()
  await expect(page.getByText('A set off each lift', { exact: true })).toHaveCount(0)
})

test("the coach's offer can be closed, and stays closed", async ({ page }) => {
  // Ignoring an offer was always free, but free is not the same as gone: a
  // card that cannot be closed sits on the screen all day arguing with a
  // decision the athlete already made.
  const state = seed((d) => {
    d.weeks['2026-08-10'].badSleepDates = ['2026-08-08', '2026-08-10']
  })
  await boot(page, state)
  await expect(page.getByText('A set off each lift', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss what the coach noticed' }).click()
  await expect(page.getByText('A set off each lift', { exact: true })).toHaveCount(0)

  // And it is written down rather than merely hidden, so it survives the
  // screen unmounting. (A reload cannot be asserted here: boot() re-seeds
  // localStorage through addInitScript on every navigation.)
  await expect
    .poll(async () => await page.evaluate(() => localStorage.getItem('naod.state') ?? ''), {
      message: 'the dismissal never reached the saved state',
    })
    .toContain('dismissed')
})

test('closing the offer still works when a verdict is on screen', async ({ page }) => {
  // Found in the J8 review pass. Slice 3 put a follow-up line inside the
  // block the dismiss button owns, and the guard that hid the offers read
  // "waved AND no verdict". So for the week after any adapt or deload
  // result landed, tapping the ✕ did nothing at all: the offers the
  // athlete had just waved away stayed exactly where they were, under a
  // button that looked like it had failed.
  const state = seed((d) => {
    d.weeks['2026-08-10'].badSleepDates = ['2026-08-08', '2026-08-10']
    d.decisions = [
      {
        id: 'v1',
        type: 'adapt',
        target: 'reduce-volume',
        ruleVersion: 1,
        evidence: { choice: 'reduce-volume' },
        offeredAt: '2026-07-20',
        response: 'accepted',
        respondedAt: '2026-07-20',
        metricId: 'sessionGrade',
        windowDays: 14,
        windowClosesAt: '2026-08-09',
        baseline: 0.4,
        outcome: 0.9,
        verdict: 'worked',
      },
    ]
  })
  await boot(page, state)

  await expect(page.getByText('A set off each lift', { exact: true })).toBeVisible()
  await expect(page.getByText('That worked', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss what the coach noticed' }).click()
  // The offer goes.
  await expect(page.getByText('A set off each lift', { exact: true })).toHaveCount(0)
  // The follow-up stays: it is the answer to a question asked a fortnight
  // ago, not an offer, and the ✕ was never about it.
  await expect(page.getByText('That worked', { exact: true })).toBeVisible()
})
