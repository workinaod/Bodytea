import { expect, test, type Page } from '@playwright/test'

// ============================================================
// Logging extra work must never end the day, and must never be
// what the plan's workout gets spent on.
//
// Reported from the live app, twice: "i did an extra workout
// and logged it and todays session is now closed off and logged
// as done." Underneath the wrong label, two real losses. The
// add-on ASSIGNED over the day's session, destroying work logged
// earlier; and on a day nobody had started, it BECAME that day's
// session, so the scheduled workout was gone (Today offers Start
// only while the day has no session at all).
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('Build muscle').click()
  await page.getByPlaceholder(/before my wedding/).fill('put on 15 lb')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '4 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByText('No weights').click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Start Week 1' }).click()
}

test('extra work joins the day instead of standing in for it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await onboard(page)

  // Log a shelf workout after the fact, on a day never started.
  await page.getByRole('button', { name: /Training something else today/ }).click()
  await page.getByRole('button', { name: /Browse workouts/ }).click()
  await page.getByText('No-Gear Burner').click()
  await page.getByRole('button', { name: 'Already did it' }).click()

  // THE BUG: the day was closed out here, graded, and the scheduled
  // workout was gone with it. The session is running instead.
  await expect(page.getByText('Session complete.')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Finish session/ })).toBeVisible()

  // And the plan's own work is still on the table: the day counts more
  // sets than the athlete has done, which it could not if the workout had
  // been replaced by what was just logged.
  const sets = async () => {
    const line = await page.getByText(/\d+\/\d+ sets/).first().innerText()
    const [, done, total] = line.match(/(\d+)\/(\d+) sets/)!
    return { done: Number(done), total: Number(total) }
  }
  const first = await sets()
  expect(first.done).toBeGreaterThan(0)
  expect(first.total).toBeGreaterThan(first.done)

  // The door is still open, because nothing inside a running session can
  // add an exercise and people have other stuff to log.
  const addMore = page.getByRole('button', { name: /Did something else too/ })
  await expect(addMore).toBeVisible()
  await addMore.click()
  await expect(page.getByText(/does not replace what you already logged/)).toBeVisible()

  // Add a second workout, and the first one's work must survive.
  await page.getByRole('button', { name: /Your own workout/ }).click()
  await page.getByRole('button', { name: '+ Add exercise' }).click()
  await page
    .getByRole('dialog', { name: 'Pick an exercise' })
    .getByText('Bird Dog', { exact: true })
    .click()
  await page.getByRole('button', { name: 'Already did it' }).click()

  // Both workouts are on the day, and so is the plan's.
  await expect(page.getByText('Bird Dog', { exact: true })).toBeVisible()
  const second = await sets()
  expect(second.done, 'the second log did not land').toBeGreaterThan(first.done)
  expect(second.total).toBeGreaterThan(second.done)
  await expect(page.getByText('Session complete.')).toHaveCount(0)
})
