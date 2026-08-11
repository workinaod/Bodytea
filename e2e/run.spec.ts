import { expect, test, type Page } from '@playwright/test'

// GPS run tracker: mocked geolocation drives a short recorded run.
test.use({
  permissions: ['geolocation'],
  geolocation: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
})

async function quickOnboard(page: Page) {
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Next — the goal' }).click()
  await page.getByText('🏀 Dunk a basketball').click()
  await page.getByPlaceholder(/dunk on a 10-ft rim/).fill('dunk on a 10-ft rim by June')
  await page.getByRole('button', { name: 'Next — my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next — my gear' }).click()
  await page.getByRole('button', { name: 'Next — experience' }).click()
  await page.getByRole('button', { name: 'Next — numbers' }).click()
  await page.getByRole('button', { name: 'Generate my booklet' }).click()
  await page.getByRole('button', { name: "Start Week 1 — let's work" }).click()
}

test('track a run with GPS: live stats → finish → logged everywhere', async ({ page, context }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await quickOnboard(page)

  // Today → cardio → Run → live tracker
  await page.getByText('Cardio / sport today?').click()
  await page.getByRole('button', { name: /^🏃\s*Run$/ }).click()
  await page.getByText('Track it live with GPS').click()

  // First fix arrives from the mocked position → recording starts
  await expect(page.getByText(/recording — screen stays on/)).toBeVisible({ timeout: 10000 })

  // Move north ~0.35 mi per minute, three times (~1 mi total)
  for (const lat of [40.7178, 40.7228, 40.7278]) {
    await page.clock.fastForward(60_000)
    await context.setGeolocation({ latitude: lat, longitude: -74.006, accuracy: 10 })
    await page.waitForTimeout(150)
  }

  await page.getByRole('button', { name: 'Finish run' }).click()
  await expect(page.getByText(/banked ✓ — cardio logged for today/)).toBeVisible()
  // ~1.04 mi of northward movement
  await expect(page.getByText(/1\.0\d/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('button', { name: 'Close' }).click()

  // The run fed the daily cardio machinery…
  await expect(page.getByText(/Cardio logged ✓ \(1\)/)).toBeVisible()

  // …and Progress now has the Runs & rides section with the entry
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByText('Runs & rides')).toBeVisible()
  await expect(page.getByText(/Run · /)).toBeVisible()
})
