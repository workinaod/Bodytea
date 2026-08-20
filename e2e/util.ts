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
