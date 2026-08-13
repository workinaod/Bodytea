import { expect, test, type Page } from '@playwright/test'

// The v19 reset is the most destructive thing the app does to existing
// users, so it gets proven end to end: a real plan and real logged data
// go in, the reset fires, and the data has to still be there afterwards.

async function buildPlan(page: Page, startLabel: string, goalChip: string, statement: string) {
  await page.getByRole('button', { name: startLabel }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText(goalChip).click()
  await page.getByPlaceholder(/dunk on a 10-ft rim/).fill(statement)
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '4 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: numbers' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
  await expect(page.getByText(/Week \d+/).first()).toBeVisible()
}

/**
 * Persistence is debounced 300ms (appStore.ts) and the installed clock is
 * frozen, so that timer only fires when the test advances time itself.
 */
async function flushStore(page: Page) {
  await page.clock.runFor(400)
}

/**
 * Rewind the stored envelope one schema version so the v19 step re-runs,
 * then reload into it.
 *
 * The rewrite has to happen while the *next* document is booting, not
 * before the reload: the app flushes state on `pagehide` (appStore.ts),
 * and that flush re-stamps the current schema version, so anything
 * written beforehand gets clobbered on the way out.
 *
 * `asOwner` additionally makes the booklet look hand-built, which is what
 * the migration uses to leave the owner's golden-locked plan alone.
 */
async function rewindAndReload(page: Page, asOwner = false) {
  await flushStore(page)
  await page.addInitScript((owner: boolean) => {
    // One-shot: later navigations in the same tab must not rewind again.
    if (sessionStorage.getItem('__rewound')) return
    sessionStorage.setItem('__rewound', '1')
    const raw = localStorage.getItem('naod.state')
    if (!raw) return
    const env = JSON.parse(raw)
    env.schemaVersion = 18
    if (owner) {
      env.data.plan.name = 'NAOD V4'
      env.data.plan.sportMode = 'ball'
    }
    localStorage.setItem('naod.state', JSON.stringify(env))
  }, asOwner)
  await page.reload()
  // Proof the rewind survived: v18 data always re-migrates to v19.
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem('__rewound')))
    .toBe('1')
}

test('v19 reset: a generated-plan user rebuilds, and keeps everything they logged', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) }) // Monday
  await page.goto('./')

  await buildPlan(page, 'Something else', '⬆️ Jump higher', 'dunk on a 10-ft rim by June')

  // Log a meal so there is real history to protect
  await page.getByRole('button', { name: 'Meals', exact: true }).click()
  await page.getByRole('button', { name: '+ Log food' }).click()
  await page.locator('button', { hasText: /Breakfast · / }).first().click()
  await expect(page.locator('text=/4[05] ?\\/ 180/').first()).toBeVisible({ timeout: 5000 })

  // The reset lands on next load
  await rewindAndReload(page)

  // Back in onboarding, told why, and told nothing was lost
  await expect(page.getByText('Your plan is being rebuilt.')).toBeVisible()
  await expect(page.getByText(/Every session, meal, run and measurement you logged is untouched/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rebuild my plan' })).toBeVisible()

  // Rebuild on a completely different goal
  await buildPlan(page, 'Rebuild my plan', '🔥 Lose weight', 'lose 30 lb by summer')

  // The logged meal survived the rebuild.
  //
  // The DENOMINATOR is deliberately not pinned here any more. This rebuild
  // switches the goal to losing weight, and the protein target now depends
  // on the situation rather than being 1 g/lb for everybody: a cut asks for
  // more, because protein is what decides whether the weight lost is fat or
  // muscle. Pinning 180 here made this test assert the old flat prescription
  // as a side effect of checking that a meal survived. What the target
  // SHOULD be per goal is covered directly in plan/sportsNutrition.test.ts.
  await page.getByRole('button', { name: 'Meals', exact: true }).click()
  await expect(page.locator('text=/4[05] ?\\/ \\d{3}/').first()).toBeVisible({ timeout: 5000 })
})

test('v19 reset leaves the owner alone', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await buildPlan(page, 'Something else', '⬆️ Jump higher', 'dunk on a 10-ft rim by June')

  // Make this look like the owner's hand-built booklet, then reset
  await rewindAndReload(page, true)

  // Straight back into the app, no onboarding
  await expect(page.getByText(/Week \d+/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Rebuild my plan/ })).toHaveCount(0)
})
