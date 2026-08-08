import { expect, test } from '@playwright/test'

// One serial journey through the core loop — each step depends on the last.
test.describe.configure({ mode: 'serial' })

test('full core loop: onboard → session → meals → debrief → export', async ({ page }) => {
  await page.goto('./')

  // ---- Onboarding ----
  await expect(page.getByRole('heading', { name: 'NAOD V3' })).toBeVisible()
  await page.getByText('Set it up (60 seconds)').click()
  await page.getByText('Next — baseline numbers').click()
  await page.getByText('Last step').click()
  await page.getByText("Let's work.").click()

  // ---- Today renders a resolved day ----
  await expect(page.getByText(/Week \d+/).first()).toBeVisible()
  const isRest = await page
    .getByText('Full Rest')
    .isVisible()
    .catch(() => false)

  if (!isRest) {
    // ---- Start session (readiness gate on CNS days) ----
    const readinessBtn = page.getByRole('button', { name: /Readiness check → start/ })
    const startBtn = page.getByRole('button', { name: 'Start session', exact: true })
    if (await readinessBtn.isVisible().catch(() => false)) {
      await readinessBtn.click()
      await expect(page.getByText('10-second readiness check')).toBeVisible()
      await page.getByRole('button', { name: /^Start session$/ }).click()
    } else {
      await startBtn.click()
    }

    // ---- Log a set on the first exercise ----
    await expect(page.getByText(/sets ·/)).toBeVisible()
    const check = page.locator('button:has-text("✓")').first()
    await check.click()

    // ---- Persistence: reload keeps the in-progress session ----
    await page.reload()
    await expect(page.getByText(/sets ·/)).toBeVisible()

    // ---- Finish → debrief ----
    await page.getByRole('button', { name: /Finish session/ }).click()
    await expect(page.getByText('Session debrief')).toBeVisible()
    await expect(page.getByText('Eat now')).toBeVisible()
    await expect(page.getByText('Sleep')).toBeVisible()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
  }

  // ---- Meals: one-tap template moves the protein ring ----
  await page.getByRole('button', { name: 'Meals', exact: true }).click()
  await expect(page.getByText('Protein', { exact: true })).toBeVisible()
  const mealChip = page.locator('button', { hasText: /Breakfast — / }).first()
  await mealChip.click()
  await expect(page.locator('text=/4[05] ?\\/ 200/').first()).toBeVisible({ timeout: 5000 })

  // ---- Progress renders ----
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByText('Last 12 weeks')).toBeVisible()

  // ---- Coach: export downloads a backup file ----
  await page.getByRole('button', { name: 'Coach', exact: true }).click()
  await page.getByRole('button', { name: '⇅ data' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export data only/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/naod-v3-backup-.*-data-only\.json/)

  // ---- Service worker registered ----
  const swCount = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations()
    return regs.length
  })
  expect(swCount).toBeGreaterThan(0)
})
