import { test, expect } from '@playwright/test'
import { emptyAppData, defaultWeekState } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// Settings is the hub for Account and Backup, and it threw you
// out of the building to reach either.
//
// Both rows called onClose() and THEN opened the next sheet, so
// closing that sheet landed on the Coach screen. A two-tap
// detour cost three taps to undo, every time, and the way it
// FELT was that the account sheet had crashed Settings.
// ============================================================

const TUESDAY = '2026-08-11'
const MONDAY = '2026-08-10'

function seed(): string {
  const d = emptyAppData(TUESDAY, TUESDAY)
  d.settings.onboarded = true
  const week = defaultWeekState(MONDAY)
  week.tier = 1
  week.tierPickedAt = `${MONDAY}T08:00:00.000Z`
  d.weeks[MONDAY] = week
  return JSON.stringify(buildEnvelope(d))
}

async function openSettings(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), seed())
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
  await page.getByRole('button', { name: 'Coach', exact: true }).click()
  await page.getByRole('button', { name: /settings/i }).first().click()
  await expect(page.getByRole('dialog')).toContainText('Settings')
}

test('closing the account sheet returns to Settings, not to Coach', async ({ page }) => {
  await openSettings(page)

  await page.getByText('Account', { exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Account & backup')

  await page.getByRole('button', { name: 'Close' }).click()
  // The bug: this used to land on the Coach screen with no sheet at all.
  await expect(page.getByRole('dialog')).toContainText('Settings')
})

test('closing the backup sheet returns to Settings too', async ({ page }) => {
  await openSettings(page)

  await page.getByText('Backup and data', { exact: true }).click()
  await expect(page.getByRole('dialog')).not.toContainText('Settings')

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toContainText('Settings')
})

test('Settings opened on its own still closes all the way out', async ({ page }) => {
  // The return trip must not become a trap: closing Settings directly,
  // without having detoured through Account, still leaves the screen.
  await openSettings(page)
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('the detour flag does not linger for the next visit', async ({ page }) => {
  // Go in, detour, come back, close everything. Opening the backup sheet
  // fresh afterwards and closing it should still return to Settings once,
  // and closing Settings should then genuinely exit.
  await openSettings(page)
  await page.getByText('Account', { exact: true }).click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toContainText('Settings')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.getByRole('button', { name: /settings/i }).first().click()
  await expect(page.getByRole('dialog')).toContainText('Settings')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
