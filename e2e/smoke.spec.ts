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

    // ---- Focus mode is the default session UI ----
    await expect(page.getByText(/Set 1 of/)).toBeVisible()
    const next = page.getByRole('button', { name: /NEXT SET|SET DONE/ })
    await expect(next).toBeVisible()
    await next.click()
    // either the break screen appears (skip it) or the next set is up
    const skipRest = page.getByRole('button', { name: /skip the rest/ })
    if (await skipRest.isVisible().catch(() => false)) {
      await skipRest.click()
    }

    // ---- Persistence: reload keeps the in-progress session (focus mode) ----
    await page.reload()
    await expect(page.getByText(/Set \d+ of/)).toBeVisible()

    // ---- Switch to list view and finish → debrief ----
    await page.getByRole('button', { name: /list/ }).click()
    await expect(page.getByText(/sets ·/)).toBeVisible()
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

test('midnight rollover advances the app without a reload', async ({ page }) => {
  // Wednesday Aug 12 2026, 23:58 local — a heavy lower day
  await page.clock.install({ time: new Date(2026, 7, 12, 23, 58) })
  await page.goto('./')
  await page.getByText('Set it up (60 seconds)').click()
  await page.getByText('Next — baseline numbers').click()
  await page.getByText('Last step').click()
  await page.getByText("Let's work.").click()

  await expect(page.getByText('Lower Strength + Hypertrophy')).toBeVisible()

  // Cross midnight (the 30s safety check and midnight timer both fire)
  await page.clock.fastForward('00:05:00')

  // Thursday's mobility day appears with NO reload or navigation
  await expect(page.getByText('Mobility + Active Recovery')).toBeVisible({ timeout: 10_000 })

  // The reconcile gate also fires on day change: Wednesday went unaccounted
  // and the Sergeant blocks the app until it's answered.
  await expect(page.getByText(/unaccounted for/)).toBeVisible()
  await page.getByText('Tired', { exact: true }).click()
  await page.getByRole('button', { name: 'Skipped, no proof' }).click()
  await expect(page.getByText(/unaccounted for/)).not.toBeVisible()

  // Meals follow too: Thursday is a rest day → 2,500 kcal target
  await page.getByRole('button', { name: 'Meals', exact: true }).click()
  await expect(page.getByText(/Rest day · 2500 kcal/)).toBeVisible()
})
