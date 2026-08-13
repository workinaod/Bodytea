import { expect, test, type Page } from '@playwright/test'

// One serial journey through the core loop, each step depends on the last.
test.describe.configure({ mode: 'serial' })

/** Walk the generator onboarding: vertical goal, 6 days, a home gym with DBs + bench + bar. */
async function onboardGenerated(page: Page) {
  await page.getByRole('button', { name: 'Something else' }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('⬆️ Jump higher').click()
  await page.getByPlaceholder(/before my wedding/).fill('by June')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  // Home gym assumes nothing, the checklist is the source of truth
  await page.getByText('Home gym').click()
  await expect(page.getByText('Check everything you have')).toBeVisible()
  await page.getByText('Dumbbells', { exact: true }).click()
  await page.getByText('Flat bench').click()
  await page.getByText('Pull-up bar', { exact: true }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: numbers' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await expect(page.getByText('Vertical Project · 6-Day')).toBeVisible()
  await expect(page.getByText(/jump higher, by June/)).toBeVisible()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
}

test('full core loop: onboard-generate → session → meals → debrief → export', async ({ page }) => {
  await page.goto('./')

  // ---- Onboarding v2 generates a personal booklet ----
  await expect(page.getByText('What do you want?')).toBeVisible()
  await onboardGenerated(page)

  // ---- Today renders a resolved day ----
  await expect(page.getByText(/Week \d+/).first()).toBeVisible()
  const isRest = await page
    .getByRole('heading', { name: /^(Full )?Rest/ })
    .isVisible()
    .catch(() => false)

  if (!isRest) {
    // ---- Start session (readiness gate on CNS days, intensity gate otherwise) ----
    const readinessBtn = page.getByRole('button', { name: /Readiness check → start/ })
    const startBtn = page.getByRole('button', { name: 'Start session', exact: true })
    if (await readinessBtn.isVisible().catch(() => false)) {
      await readinessBtn.click()
      await expect(page.getByText('10-second readiness check')).toBeVisible()
      await page.getByRole('button', { name: /^Start session$/ }).click()
    } else {
      await startBtn.click()
      await expect(page.getByText('How much do you have today?')).toBeVisible()
      await page.getByRole('button', { name: /^Full session/ }).click()
    }

    // ---- Focus mode is the default session UI: GO gate, then the set ----
    // (both the prescription line and the intro caption carry "Set 1 of")
    await expect(page.getByText(/Set 1 of/).first()).toBeVisible()
    // Loaded first exercises demand a weight before GO, enter one like a human
    const weightPlus = page.getByRole('button', { name: '+', exact: true })
    if (await weightPlus.isVisible().catch(() => false)) await weightPlus.click()
    await page.getByRole('button', { name: /^GO · START SET/ }).click()
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
    await expect(page.getByText(/Set \d+ of/).first()).toBeVisible()

    // ---- Switch to list view and finish → quit gate → debrief ----
    await page.getByRole('button', { name: /list/ }).click()
    await expect(page.getByText(/sets ·/)).toBeVisible()
    await page.getByRole('button', { name: /Finish session/ }).click()
    // sets are still open, so the quit confirmation must intercept
    await expect(page.getByText('Stop here?')).toBeVisible()
    await page.getByRole('button', { name: /^Stop, I'm done at/ }).click()
    await expect(page.getByText('Session debrief')).toBeVisible()
    await expect(page.getByText('Eat now')).toBeVisible()
    await expect(page.getByRole('heading', { name: /Sleep/ })).toBeVisible()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
  }

  // ---- Meals: log-first, the one button opens every path ----
  await page.getByRole('button', { name: 'Meals', exact: true }).click()
  await expect(page.getByText('Protein', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '+ Log food' }).click()
  await page.locator('button', { hasText: /Breakfast · / }).first().click() // one tap, sheet closes
  // Generated plan @180 lb → protein target 180 g (1 g/lb)
  await expect(page.locator('text=/4[05] ?\\/ 180/').first()).toBeVisible({ timeout: 5000 })

  // ---- My plan: bring your own meals, get common-grocery swaps ----
  await page.getByRole('button', { name: 'My plan', exact: true }).click()
  await page.getByRole('button', { name: '+ Add a meal' }).click()
  await page.getByPlaceholder('Meal name').fill('Chipotle bowl')
  await page.getByPlaceholder('Protein (g)').fill('50')
  await page.getByPlaceholder('Calories').fill('800')
  await page.getByRole('button', { name: 'Save meal' }).click()
  // The saved meal offers alternatives at matching macros
  await page.getByText('Meal · Chipotle bowl').click()
  await expect(page.getByText('Same macros, common groceries')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Use instead' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  // Back on the log view, THEIR meal is now a one-tap log
  await page.getByRole('button', { name: 'Log', exact: true }).click()
  await page.getByRole('button', { name: '+ Log food' }).click()
  await page.getByText('Meal · Chipotle bowl').click()
  await expect(page.locator('text=/9[05] ?\\/ 180/').first()).toBeVisible()

  // ---- Progress renders ----
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await expect(page.getByText('Last 12 weeks')).toBeVisible()

  // ---- Guided body-fat estimate: tape numbers → Navy formula → check-in ----
  await page.getByText('+ log measurements').click()
  await page.getByText(/Estimate with a tape/).click()
  await page.getByText('Male formula (neck + waist)').click() // height stays at the 70" default
  await page.getByRole('button', { name: 'Next: first measurement' }).click()
  await expect(page.getByText(/below the Adam’s apple/i)).toBeVisible() // step-by-step guidance
  await page.getByRole('button', { name: 'Next site' }).click() // neck 15" default
  await page.getByRole('button', { name: 'Calculate' }).click() // waist 34" default
  await expect(page.getByText('17.5%', { exact: true })).toBeVisible() // published-formula result
  await page.getByRole('button', { name: /Use 17.5% in this check-in/ }).click()
  await page.getByRole('button', { name: 'Save check-in' }).click()

  // Saving rolls the Wrapped-style weekly recap, tap out of the story
  await expect(page.getByText('This week', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '✕' }).click()

  // Milestones section exists with locked marks counting down
  await expect(page.getByText('3-Month Review')).toBeVisible()
  await expect(page.getByText(/unlocks in \d+ days/).first()).toBeVisible()

  // ---- Coach: export downloads a backup file ----
  await page.getByRole('button', { name: 'Coach', exact: true }).click()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: /^Backup and data/ }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /Export data only/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/bodyt-backup-.*-data-only\.json/)

  // ---- Service worker registered ----
  const swCount = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations()
    return regs.length
  })
  expect(swCount).toBeGreaterThan(0)
})

test('midnight rollover advances the app without a reload', async ({ page }) => {
  // Wednesday Aug 12 2026, 23:58 local, a heavy lower day
  await page.clock.install({ time: new Date(2026, 7, 12, 23, 58) })
  await page.goto('./')
  await onboardGenerated(page)

  await expect(page.getByText('Lower Strength', { exact: true })).toBeVisible()

  // Cross midnight: the unstarted day does NOT vanish, the 12–3am
  // window keeps Wednesday open (and startable) under a grace banner.
  await page.clock.fastForward('00:05:00')
  await expect(page.getByText(/still open until 3 AM/)).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Lower Strength', { exact: true })).toBeVisible()

  // Past 03:00 the window closes: Thursday arrives with NO reload…
  await page.clock.fastForward('03:10:00')
  await expect(page.getByText('Mobility + Active Recovery')).toBeVisible({ timeout: 10_000 })

  // …and the reconcile gate fires for the now-genuinely-missed Wednesday.
  await expect(page.getByText(/unaccounted for/)).toBeVisible()
  await page.getByText('Tired', { exact: true }).click()
  await page.getByRole('button', { name: 'Skipped, no proof' }).click()
  await expect(page.getByText(/unaccounted for/)).not.toBeVisible()

  // Meals follow too: Thursday is a rest day → the GENERATED rest target
  // (180 lb vertical plan: 2700 base + 200 goal − 300 rest = 2600)
  await page.getByRole('button', { name: 'Meals', exact: true }).click()
  await expect(page.getByText(/Rest day · 2600 kcal/)).toBeVisible()
})
