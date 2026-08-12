import { expect, test, type Page } from '@playwright/test'

// Daily cardio logging + custom life events with a per-week day picker.
test.describe.configure({ mode: 'serial' })

async function quickOnboard(page: Page) {
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('🏀 Dunk a basketball').click()
  await page.getByPlaceholder(/dunk on a 10-ft rim/).fill('dunk on a 10-ft rim by June')
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click() // Mon–Sat sessions
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: numbers' }).click()
  await page.getByRole('button', { name: 'Generate my booklet' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
}

test('daily cardio: run outdoors with miles; game day marks played', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await quickOnboard(page)

  // Log an outdoor run, only the run's questions appear
  await page.getByText('Cardio today?').click()
  await page.getByRole('button', { name: 'Log it Already done' }).click()
  await page.getByRole('button', { name: /^🏃\s*Run$/ }).click()
  await expect(page.getByText('Indoor or outdoor?')).toBeVisible()
  await page.getByText('🌤 Outdoor').click()
  await expect(page.getByText('Miles', { exact: true })).toBeVisible()
  await page.getByText('Around the workout?').isVisible() // session day → pre/post choice
  await page.getByText('Pre-workout').click()
  await page.getByRole('button', { name: 'Log it' }).click()
  await expect(page.getByText(/outdoor · 2 mi · 30 min · pre-workout/)).toBeVisible()

  // A second entry: basketball running games
  await page.getByRole('button', { name: /Basketball/ }).click()
  await expect(page.getByText("How'd it go down?")).toBeVisible()
  await page.getByText('Running games').click()
  await page.getByText('Post-workout').click()
  await page.getByRole('button', { name: 'Log it' }).click()
  await page.getByRole('button', { name: 'Close' }).click()

  // Chip shows the log; the engine treats the game like ball
  await expect(page.getByText(/Cardio logged ✓ \(2\)/)).toBeVisible()
  await expect(page.getByText(/that's this week's conditioning/)).toBeVisible()

  // Week tab: played marker + backup section satisfied
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(page.getByText('🏃 conditioned').first()).toBeVisible()
})

test('custom life events: add one, pick its days, engine reacts next day', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await quickOnboard(page)

  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await expect(page.getByText('Life this week')).toBeVisible()
  // Generated plans start with no events, the empty-state pitch shows
  await expect(page.getByText(/Late nights, long shifts/)).toBeVisible()

  // Create a custom on-feet event and mark it for Monday
  await page.getByRole('button', { name: /Add a life event/ }).click()
  await page.getByPlaceholder(/Name it/).fill('Closing shift')
  await page.getByText('🦵 On my feet all day').click()
  await page.getByRole('button', { name: 'Add it' }).click()
  await expect(page.getByText('🦵 Closing shift')).toBeVisible()
  await page
    .locator('div')
    .filter({ hasText: /^Which days\?/ })
    .getByRole('button', { name: 'Mon', exact: true })
    .click()

  // Markers: Monday shows the event, Tuesday shows the jump-set drop
  await expect(page.getByText('🦵 on feet')).toBeVisible()
  await expect(page.getByText('⚡ −1 jump set')).toBeVisible()

  // Tomorrow's session carries the pre-fatigued banner
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await page.getByRole('button', { name: 'Next day' }).click() // Tuesday
  await expect(page.getByText(/Closing shift yesterday: a jump set dropped/)).toBeVisible()

  // A late-night event warns on the day itself
  await page.getByRole('button', { name: 'Week', exact: true }).click()
  await page.getByRole('button', { name: /Add a life event/ }).click()
  await page.getByPlaceholder(/Name it/).fill('DJ set')
  await page.getByText('🌙 Late night').click()
  await page.getByRole('button', { name: 'Add it' }).click()
  await page
    .locator('div')
    .filter({ hasText: /^Which days\?/ })
    .nth(1)
    .getByRole('button', { name: 'Mon', exact: true })
    .click()
  await page.getByRole('button', { name: 'Today', exact: true }).click()
  await expect(page.getByText(/DJ set tonight/)).toBeVisible()
})

test('same-day trim: work ran long → volume cut today, restorable', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')
  await quickOnboard(page)

  // The Can't-train flow leads with the trim, still training, just less
  await page.getByRole('button', { name: "Can't train" }).click()
  await page.getByRole('button', { name: /Trim today's load/ }).click()
  await page.getByRole('button', { name: 'Work / busy' }).click()
  await page.getByRole('button', { name: 'Trim it, still training' }).click()

  // The day resolves trimmed, with the escape hatch offered
  await expect(page.getByText(/You called a trimmed day/)).toBeVisible()
  await expect(page.getByText(/Restore the full session/)).toBeVisible()

  // Meeting cancelled, full session comes back
  await page.getByText(/Restore the full session/).click()
  await expect(page.getByText(/You called a trimmed day/)).not.toBeVisible()
})
