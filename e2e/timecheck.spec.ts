import { test, expect, type Page } from '@playwright/test'

// ============================================================
// Short on time is not the same as too hard.
//
// "the cant finish button is for when a workout is too hard but
// if theres a scheduling or time issue just have a check for
// time." Two controls, and the quiet one must never write a
// fatigue note: the gym closing says nothing about how strong
// anyone is, and the engine learns from those notes.
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('Jump higher').click()
  await page.getByPlaceholder(/before my wedding/).fill('by June')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
}

async function startSession(page: Page) {
  await page.getByRole('button', { name: /Start session/ }).click()
  await page.waitForTimeout(400)
  const full = page.getByRole('button', { name: /Full session/ })
  if (await full.isVisible().catch(() => false)) await full.click()
  await page.waitForTimeout(500)
}

/** Sets still to do, straight off the header the session shows. */
async function setsLeft(page: Page): Promise<number> {
  const t = await page.locator('body').innerText()
  const m = t.match(/(\d+)\s*\/\s*(\d+)\s*sets/i)!
  return Number(m[2]) - (Number(m[1]) - 1)
}

test('cutting to the essentials makes the day shorter', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  const before = await setsLeft(page)

  await page.getByRole('button', { name: 'Short on time?' }).click()
  await page.getByRole('button', { name: /Cut to the essentials/ }).click()
  await page.getByRole('button', { name: 'Back to the set' }).click()
  await page.waitForTimeout(500)

  expect(await setsLeft(page), 'the day is the same length').toBeLessThan(before)
})

test('it never writes a fatigue note, because this is not fatigue', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  await page.getByRole('button', { name: 'Short on time?' }).click()
  await page.getByRole('button', { name: /Cut to the essentials/ }).click()
  await page.getByRole('button', { name: 'Back to the set' }).click()
  await page.waitForTimeout(400)

  const notes = await page.evaluate(() => {
    const raw = localStorage.getItem('naod.state')
    const sessions = raw ? JSON.parse(raw)?.data?.sessions ?? {} : {}
    const only = Object.values(sessions)[0] as { fatigue?: unknown[] } | undefined
    return only?.fatigue?.length ?? 0
  })
  expect(notes, 'running out of time got logged as running out of strength').toBe(0)
})

test('the three escape hatches sit on one line at 390px', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  // Adding the third control wrapped every label onto two lines. Nothing
  // overflowed, so no measurement caught it and only the screenshot did.
  // Same top edge and a single-line height is what "one row" means.
  const rows = await page.evaluate(() =>
    ['How do I do this?', "Can't finish", 'Short on time?'].map((t) => {
      const b = Array.from(document.querySelectorAll("button")).find((x) => x.textContent?.trim() === t)
      const r = b?.getBoundingClientRect()
      return r ? { top: Math.round(r.top), h: Math.round(r.height) } : null
    }),
  )
  expect(rows.every(Boolean), 'a control is missing').toBe(true)
  const tops = new Set(rows.map((r) => r!.top))
  expect(tops.size, 'the controls wrapped onto separate rows').toBe(1)
  for (const r of rows) {
    expect(r!.h, 'a label wrapped to two lines').toBeLessThan(46)
  }
})
