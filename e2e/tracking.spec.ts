import { test, expect, type Page } from '@playwright/test'

// The timer used to record one number, the clock, and hand the rest to
// a guess. It now runs the pedometer alongside it and reports what it
// measured. These guard the two ways that goes wrong on a real phone:
// promising a measurement the device cannot take, and printing a zero
// where "we could not tell" was the honest answer.
//
// Headless Chromium reports no device motion, which is exactly the
// case that matters: permission refused, phone in a bag, old handset.
// The session still has to log.

async function onboard(page: Page) {
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('🎯 All-around athlete').click()
  await page.getByPlaceholder(/dunk on a 10-ft rim/).fill('stay dangerous year-round')
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: numbers' }).click()
  await page.getByRole('button', { name: 'Generate my booklet' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
}

const timer = (page: Page) => page.locator('.fixed.inset-0.z-\\[90\\]')

async function openTracker(page: Page, activity: string) {
  await page.getByRole('button', { name: 'Track a run or ride' }).click()
  await page.clock.runFor(600)
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: new RegExp(activity, 'i') }).first().click()
  await page.clock.runFor(400)
  await page.waitForTimeout(400)
}

test('it only promises a measurement it can actually take', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)

  // Basketball is counted but not mapped: a court is shorter than GPS
  // error, so distance comes from the step count.
  await openTracker(page, 'Basketball')
  await expect(timer(page)).toContainText('counts your steps')
  await expect(timer(page)).not.toContainText('and distance')
  await page.getByRole('button', { name: 'Close' }).click()
  await page.waitForTimeout(300)

  // Nobody takes a step in a swimming pool.
  await openTracker(page, 'Swim')
  await expect(timer(page)).toContainText('Timer starts when you do')
  await expect(timer(page)).not.toContainText('steps')
})

test('a session with nothing to measure still logs, and shows no zeros', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await openTracker(page, 'Basketball')

  await page.getByRole('button', { name: /Start basketball/i }).click()
  await page.clock.runFor(65_000)
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.clock.runFor(400)
  await page.waitForTimeout(400)

  await expect(timer(page)).toContainText('Logged')
  // No pedometer means no step count and no distance. Printing "0
  // steps · 0.00 mi" claims the athlete stood still, which is a
  // different and much ruder statement than "we could not tell".
  await expect(timer(page)).not.toContainText('steps')
  await expect(timer(page)).not.toContainText('0.00')
  await expect(timer(page)).not.toContainText('intensity')
  // The clock and the calories are what was actually earned.
  await expect(timer(page)).toContainText('cal')

  await page.getByRole('button', { name: 'Done' }).click()
  await page.clock.runFor(400)
  await page.waitForTimeout(400)
  await expect(page.getByText(/Cardio logged/)).toBeVisible()

  // And it reaches Progress, which before this could only tell you
  // about runs and rides. An hour of ball was invisible there.
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await page.clock.runFor(400)
  await page.waitForTimeout(400)
  await expect(page.getByText('Sport, last 30 days')).toBeVisible()
  await expect(page.getByText('Basketball', { exact: true })).toBeVisible()
})

test('a session with no measured distance never prints 0.00 mi', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)

  // Seed the two GPS sessions that used to render wrong: a treadmill
  // run the satellites never saw, and a hike, which printed as "Run"
  // because the label was a two-way choice made when there were only
  // two activities.
  // The write has to land while the NEXT document is booting. Done as a
  // plain evaluate before a reload it gets clobbered: the running app
  // still has a save in flight and puts its own copy back.
  await page.clock.runFor(400)
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    const raw = localStorage.getItem('naod.state')
    if (!raw) return
    const env = JSON.parse(raw)
    env.data.runs = [
      {
        id: 'treadmill',
        activity: 'run',
        date: '2026-08-10',
        startedAt: '2026-08-10T07:00:00.000Z',
        durationSec: 1800,
        distanceMi: 0,
        distanceSource: 'none',
        steps: 4200,
        avgPaceSec: 0,
        kcalEst: 300,
        splits: [],
        points: [],
      },
      {
        id: 'walkup',
        activity: 'hike',
        date: '2026-08-09',
        startedAt: '2026-08-09T07:00:00.000Z',
        durationSec: 3600,
        distanceMi: 2.8,
        distanceSource: 'gps',
        avgPaceSec: 1285,
        kcalEst: 420,
        splits: [],
        points: [],
      },
    ]
    localStorage.setItem('naod.state', JSON.stringify(env))
  })
  await page.reload()
  await page.clock.runFor(600)
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await page.clock.runFor(400)
  await page.waitForTimeout(500)

  const list = page.getByText(/Run · /).locator('..')
  // The treadmill session reports what it has, not a zero and two
  // dashes. "0.00 mi · 30:00 · --" is three ways of saying nothing.
  await expect(list).toContainText('4,200 steps')
  await expect(page.getByText('0.00 mi')).toHaveCount(0)
  // And a hike is a hike.
  await expect(page.getByText(/Hike · /)).toBeVisible()
})
