import { test, type Page } from '@playwright/test'
import { expect } from '@playwright/test'

// A name typed into the custom row has to survive all the way to the
// timer and into the log. Picking "Custom" and getting a session called
// "Custom" is the failure this guards.
async function onboard(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('All-round fitness').click()
  await page.getByPlaceholder(/before my wedding/).fill('stay dangerous year-round')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: "Start Week 1" }).click()
}
test('a custom activity keeps the name you typed', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await page.getByRole('button', { name: 'Track a run or ride' }).click()
  await page.clock.runFor(600)
  await page.waitForTimeout(600)
  await page.getByPlaceholder('Custom').fill('Padel')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(600)
  await page.waitForTimeout(400)
  await expect(page.getByRole('button', { name: /Start padel/i })).toBeVisible()
})
