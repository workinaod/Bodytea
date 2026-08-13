import { test, expect } from '@playwright/test'

// ============================================================
// Two things the preview screen has to get right.
//
// Both of these shipped broken and both were invisible to the
// unit suite, because both are about what the SCREEN shows
// rather than what a function returns.
// ============================================================

async function toPreview(page: import('@playwright/test').Page) {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await page.getByRole('button', { name: /Lose weight/ }).click()
  await page.locator('input').first().fill('Maya')
  await page.getByRole('button', { name: 'Female', exact: true }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByRole('button', { name: /Next: a few questions/ }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
}

test('the protein card and the protein sentence say the same number', async ({ page }) => {
  // The card used to run off a stand-in that just echoed bodyweight, so
  // it read 180 g while the note directly beneath it said 210 g. A plan
  // that contradicts itself in the space of one screen is not a plan
  // anyone is going to trust with their food.
  await toPreview(page)

  const card = await page.locator('text=/^\\d+g$/').first().innerText()
  const grams = card.replace('g', '')
  await expect(page.getByText(new RegExp(`Protein holds at ${grams} g`))).toBeVisible()
})

test('every onboarding choice is a real button', async ({ page }) => {
  // The chips were <span onClick>. They looked tappable and they were,
  // with a finger — but they were invisible to a keyboard, silent to a
  // screen reader, and half the height a tap target should be.
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await page.getByRole('button', { name: /Lose weight/ }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()

  for (const label of ['Build muscle', 'Get stronger']) {
    await expect(page.getByRole('button', { name: new RegExp(label) }).first()).toBeVisible()
  }

  // Focus areas wait their turn behind the detail box, and arrive on the
  // next tap — which is the "or nothing to add" answer.
  await expect(page.getByRole('button', { name: 'Arms' })).toHaveCount(0)
  await page.getByText("Let's get specific").click()
  for (const label of ['Arms', 'Core']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible()
  }

  await page.getByRole('button', { name: /Next: a few questions/ }).click()
  await expect(page.getByRole('button', { name: 'A few pounds' })).toBeVisible()

  // aria-pressed, so the selected state is announced and not just coloured.
  const chip = page.getByRole('button', { name: '30 to 60 lb' })
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
})
