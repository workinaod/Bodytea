import { test, expect } from '@playwright/test'
import { emptyAppData, defaultWeekState } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// Every modal in this app is one component, and it was missing
// everything that is not a touchscreen.
//
// No role, so a screen reader announced a sheet as an anonymous
// pile of divs with the whole background still readable behind
// it. No Escape, so on the desktop PWA an opened sheet was a
// keyboard dead end. No focus move, so the focus ring stayed on
// the button UNDER the sheet — which is also where a screen
// reader's cursor stayed, reading a screen the user could not
// see and could not act on.
//
// `locked` has to survive all of it. SkipFlow and the reconcile
// gate are deliberately inescapable — no X, a dead backdrop, and
// a drag that only rubber-bands — and an Escape key that walked
// out of them would quietly undo the accountability the whole
// app is built around.
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

async function boot(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), seed())
  await page.clock.install({ time: new Date(2026, 7, 11, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
}

/** The "?" beside an exercise opens the guide, an ordinary unlocked sheet. */
async function openGuide(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '?' }).first().click()
}

test('a sheet announces itself as a modal dialog, named by its own title', async ({ page }) => {
  await boot(page)
  await openGuide(page)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  // Named, not anonymous: the accessible name has to come from the heading
  // the sighted user is reading, or the announcement carries nothing.
  await expect(dialog).not.toHaveAccessibleName('')
})

test('focus moves into an opened sheet instead of staying on the button behind it', async ({ page }) => {
  await boot(page)
  await openGuide(page)
  await expect(page.getByRole('dialog')).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(() => !!document.querySelector('[role=dialog]')?.contains(document.activeElement)),
    )
    .toBe(true)
})

test('Escape closes an unlocked sheet', async ({ page }) => {
  await boot(page)
  await openGuide(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('Escape is not a back door out of a locked sheet', async ({ page }) => {
  await boot(page)
  // "Can't train" raises SkipFlow, which is locked on purpose.
  await page.getByRole('button', { name: "Can't train" }).click()

  const gate = page.getByRole('dialog')
  await expect(gate).toBeVisible()
  // The tell that this is the locked one: no close button was rendered.
  await expect(gate.getByRole('button', { name: 'Close' })).toHaveCount(0)

  await page.keyboard.press('Escape')
  await expect(gate).toBeVisible()
})
