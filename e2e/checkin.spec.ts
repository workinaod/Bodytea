import { test, expect, type Page } from '@playwright/test'

// ============================================================
// One check-in, halfway, once.
//
// The old question was "How was the weight?", asked on the middle
// SET of an exercise, once a fortnight. Wrong scope and wrong
// moment: "early on you can feel good but by the third workout
// your dead". So it now asks about the whole day, once, at the
// point where the answer means something.
//
// The two things worth pinning: it does NOT appear on the first
// rest break, and it does not come back after it is answered.
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
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

const question = (page: Page) => page.getByText('How is this session sitting?')
const oldQuestion = (page: Page) => page.getByText('How was the weight?')

/** Finish one set: gate → go → done. Leaves the rest screen up if there is one. */
async function oneSet(page: Page) {
  const go = page.getByRole('button', { name: /^GO · START SET/ })
  if (await go.isVisible().catch(() => false)) {
    await go.click()
    await page.waitForTimeout(3400) // the 3-2-1 countdown
  }
  await page.getByRole('button', { name: /NEXT SET|SET DONE/ }).click()
  await page.waitForTimeout(350)
}

/** Dismiss the rest screen if it is showing. */
async function skipRest(page: Page) {
  const skip = page.getByRole('button', { name: /skip the rest/ })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click()
    await page.waitForTimeout(250)
  }
}

test('the check-in waits for halfway, then never asks again', async ({ page }) => {
  test.setTimeout(180_000)
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await page.getByRole('button', { name: /Start session/ }).click()
  await page.waitForTimeout(400)
  const full = page.getByRole('button', { name: /Full session/ })
  if (await full.isVisible().catch(() => false)) await full.click()
  await page.waitForTimeout(500)

  const header = await page.locator('body').innerText()
  const total = Number(header.match(/\/\s*(\d+)\s*sets/i)![1])
  const halfway = Math.ceil(total / 2)

  // The old per-exercise question is gone for good.
  await expect(oldQuestion(page)).toHaveCount(0)

  // First rest break: far too early to ask how the day is going.
  await oneSet(page)
  await expect(question(page), 'asked on the very first break').toBeHidden()
  await skipRest(page)

  // Work to the halfway mark.
  let asked = 0
  for (let done = 2; done <= halfway + 1 && done <= total; done++) {
    await oneSet(page)
    if (await question(page).isVisible().catch(() => false)) {
      asked++
      expect(done, 'asked before halfway').toBeGreaterThanOrEqual(halfway)
      await page.getByRole('button', { name: 'Heavy', exact: true }).click()
      await page.waitForTimeout(250)
    }
    await skipRest(page)
  }
  expect(asked, 'the check-in never appeared at all').toBe(1)

  // Answered once is answered. It must not come back later in the day.
  for (let i = 0; i < 3 && (await page.getByRole('button', { name: /NEXT SET|SET DONE|GO ·/ }).count()); i++) {
    await oneSet(page)
    await expect(question(page), 'asked twice in one session').toBeHidden()
    await skipRest(page)
  }
})
