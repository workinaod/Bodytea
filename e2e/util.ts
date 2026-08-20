import { expect, type Page } from '@playwright/test'

// ============================================================
// Helpers shared across specs.
//
// The rule for putting something here: it is a walk through app
// UI that MORE THAN ONE spec has to do, and that a redesign
// will change. Inlining those is how sixteen specs ended up
// clicking a button that had been renamed, for five days,
// without anybody noticing (see e2eSelectors.test.ts).
// ============================================================

/**
 * Ending a live session now plays a short ceremony before the debrief
 * sheet: work banked, then whatever was actually earned, then tomorrow.
 * Every beat auto-advances except the last, which waits for Continue.
 *
 * Call this straight after the click that ends the session.
 */
export async function finishToDebrief(page: Page): Promise<void> {
  const carryOn = page.getByRole('button', { name: 'Continue', exact: true })
  await expect(carryOn).toBeVisible({ timeout: 20_000 })
  await carryOn.click()
  await expect(page.getByRole('dialog', { name: 'Session debrief' })).toBeVisible()
}

/** The Meals tab is now My Plan's second segment. */
export async function openNutrition(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.getByRole('button', { name: 'Nutrition', exact: true }).click()
}

/** Everything off the plan (shelf, own workout, previous days) lives in Train. */
export function trainTab(page: Page) {
  return page.getByRole('button', { name: 'Train', exact: true })
}

/** The whole program lives behind one tab; Training is the half it opens on. */
export async function planTab(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
}

/**
 * The coach feed, the runs and every session: the Record segment of
 * Progress. It used to be the bottom two thirds of a Coach tab.
 */
export async function openRecord(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Progress', exact: true }).click()
  await page.getByRole('button', { name: 'Record', exact: true }).click()
}

/**
 * The generator onboarding walk, start to Week 1.
 *
 * Six specs had their own copy of these twenty clicks. It is exactly the
 * kind of walk a redesign changes, which is the rule for putting
 * something in this file.
 */
export async function onboardGenerated(page: Page): Promise<void> {
  await page.getByRole('button', { name: "Let's get started" }).click()
  await page.locator('input').first().fill('Naod')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('Jump higher').click()
  await page.getByPlaceholder(/before my wedding/).fill('by June')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByText('Full gym').click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Start Week 1' }).click()
}
