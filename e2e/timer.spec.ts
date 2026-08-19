import { test, expect, type Page } from '@playwright/test'

// The timer opened from inside the Track sheet, and that sheet's
// backdrop-blur is a containing block for fixed children, so the
// full-screen timer was confined to the sheet's box: an inset panel
// with two close buttons and its title tucked behind one of them.
// It portals to the body now. One X, edge to edge.
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
test('the custom timer is a full-screen takeover, not a panel', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await page.getByRole('button', { name: 'Track a run or ride' }).click()
  await page.clock.runFor(600)
  await page.getByPlaceholder('Custom').fill('Padel')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.runFor(800)
  await page.waitForTimeout(500)
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(1)
  // Edge to edge: confined inside the sheet it was inset on both sides.
  const box = await page.locator('.fixed.inset-0.z-\\[90\\]').boundingBox()
  expect(box?.width).toBe(390)
})
