import { expect, test, type Page } from '@playwright/test'

// ============================================================
// Choosing an exercise, with help.
//
// The picker used to offer all 194 movements to everybody. For
// an athlete with nothing but a floor, 138 of them are
// impossible, and the equipment data to know that had existed
// since the generator was written. These pin that the list is
// now what you can actually do, that the rest is one tap away
// and honest about what it needs, and that the filters are real
// buttons rather than tappable text.
// ============================================================

/** Onboard with no equipment at all: the case the picker failed hardest. */
async function onboardBareFloor(page: Page) {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
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

async function openPicker(page: Page) {
  await page.getByRole('button', { name: /Training something else today/ }).click()
  await page.getByRole('button', { name: /Your own workout/ }).click()
  await page.getByRole('button', { name: '+ Add exercise' }).click()
}

test('the picker offers what you can do, and says what the rest would need', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboardBareFloor(page)
  await openPicker(page)

  const sheet = page.getByRole('dialog', { name: 'Pick an exercise' })

  // Filtered by default, and it says how much it is holding back.
  await expect(sheet.getByRole('button', { name: /Only what I can do/ })).toBeVisible()
  await expect(sheet.getByText(/\d+ need gear you have not got/)).toBeVisible()
  // A bare floor cannot do these, so they are not on offer.
  await expect(sheet.getByText('Goblet Squat', { exact: true })).toHaveCount(0)
  await expect(sheet.getByText('Sled Push', { exact: true })).toHaveCount(0)
  // What it CAN do is there.
  await expect(sheet.getByText('Push-Up', { exact: true })).toBeVisible()

  // One tap shows everything, each unusable row labelled with its cost.
  await sheet.getByRole('button', { name: /Only what I can do/ }).click()
  await expect(sheet.getByRole('button', { name: /Showing everything/ })).toBeVisible()
  await expect(sheet.getByText('Goblet Squat', { exact: true })).toBeVisible()
  await expect(sheet.getByText(/needs dumbbells/).first()).toBeVisible()
})

test('you can browse by the muscle you actually want to train', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboardBareFloor(page)
  await openPicker(page)
  const sheet = page.getByRole('dialog', { name: 'Pick an exercise' })

  // The filters are real buttons that announce their state, not tappable
  // text: the same defect the onboarding chips were fixed for.
  const back = sheet.getByRole('button', { name: 'Back', exact: true })
  await expect(back).toHaveAttribute('aria-pressed', 'false')
  await back.click()
  await expect(back).toHaveAttribute('aria-pressed', 'true')

  // Back movements only, and the app says where that group stands.
  await expect(sheet.getByText('Inverted Row', { exact: true })).toBeVisible()
  await expect(sheet.getByText('Push-Up', { exact: true })).toHaveCount(0)
  await expect(sheet.getByText(/^Back:/)).toBeVisible()
})

test('the builder shows what the workout covers and what it misses', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboardBareFloor(page)
  await openPicker(page)

  await page
    .getByRole('dialog', { name: 'Pick an exercise' })
    .getByText('Push-Up', { exact: true })
    .click()

  const own = page.getByRole('dialog', { name: 'Your own workout' })
  await expect(own.getByText('What this covers')).toBeVisible()
  // A push-up's prime movers are chest and triceps, so those groups light
  // and the ones it never touches are named rather than left to guess.
  await expect(own.getByText(/Not in this one:.*legs/)).toBeVisible()
  // Bodyweight load is ADDED weight, which is what the session screen calls it.
  await expect(own.getByText('added', { exact: true })).toBeVisible()
})
