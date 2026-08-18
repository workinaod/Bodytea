import { test, expect, type Page } from '@playwright/test'

// ============================================================
// "Can't finish" asks why, and the answer does something.
//
// Two regressions in one: the button used to open the whole-day
// skip flow, which is a different problem, and it opened it
// BEHIND the session at z-50 so it looked completely dead.
// Both halves are pinned here: the sheet is reachable and
// hit-testable above the session, and choosing an answer
// actually changes the set.
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
  await page.getByRole('button', { name: "Start Week 1" }).click()
}

async function startSession(page: Page) {
  await page.getByRole('button', { name: /Start session/ }).click()
  await page.waitForTimeout(400)
  const full = page.getByRole('button', { name: /Full session/ })
  if (await full.isVisible().catch(() => false)) await full.click()
  await page.waitForTimeout(500)
}

/**
 * The weight actually stored for the set being shown. Read from state
 * rather than scraped off the stepper: the point of the offer is that
 * the PRESCRIPTION changed, not that a label did.
 */
async function setWeight(page: Page, exIdx = 0, setIdx = 0): Promise<number | undefined> {
  return page.evaluate(
    ([ex, st]) => {
      const raw = localStorage.getItem('naod.state')
      const sessions = raw ? JSON.parse(raw)?.data?.sessions ?? {} : {}
      const only = Object.values(sessions)[0] as
        | { exercises: { sets: { weightLb?: number }[] }[] }
        | undefined
      return only?.exercises?.[ex]?.sets?.[st]?.weightLb
    },
    [exIdx, setIdx],
  )
}

test('the sheet opens ABOVE the session and takes a real tap', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  await page.getByRole('button', { name: "Can't finish" }).click()
  await page.waitForTimeout(400)

  const chip = page.getByRole('button', { name: /Muscle fatigue/ })
  await expect(chip).toBeVisible()

  // The z-50 bug: the sheet rendered under FocusView's z-70, so it was
  // visible to a screenshot and unreachable to a finger. Ask the browser
  // what is actually under the point, the way session.spec.ts does.
  const box = (await chip.boundingBox())!
  const onTop = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y)
      return !!el?.closest('button')?.textContent?.includes('Muscle fatigue')
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  )
  expect(onTop, 'something is covering the sheet').toBe(true)
})

test('muscle fatigue drops the weight on the set you are standing in', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  const before = await setWeight(page)
  expect(before, 'no weight to drop from').toBeGreaterThan(0)

  await page.getByRole('button', { name: "Can't finish" }).click()
  await page.getByRole('button', { name: /Muscle fatigue/ }).click()
  await page.getByRole('button', { name: /Drop to \d+ lb/ }).click()
  await page.getByRole('button', { name: 'Back to the set' }).click()
  await page.waitForTimeout(400)

  expect(await setWeight(page), 'the weight did not move').toBeLessThan(before!)
})

test('hurts ends the exercise and moves the session on', async ({ page }) => {
  test.setTimeout(120_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await startSession(page)

  const firstName = await page.locator('h2').first().innerText()

  await page.getByRole('button', { name: "Can't finish" }).click()
  await page.getByRole('button', { name: /Hurts/ }).click()
  await page.getByRole('button', { name: 'Stop this exercise' }).click()
  await page.getByRole('button', { name: 'Back to the set' }).click()
  await page.waitForTimeout(500)

  await expect(page.locator('h2').first(), 'still on the same movement').not.toHaveText(firstName)
})
