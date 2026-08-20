import { test, expect } from '@playwright/test'
import { defaultWeekState, emptyAppData } from '../src/types'
import { buildEnvelope } from '../src/store/backup'

// ============================================================
// Two of four readiness flags dials the day back. R3 s9.2 makes that
// per-athlete: enough dialled-back days that went fine, and the app
// offers to only do it when things are really bad.
//
// The answer has to reach the DOOR, not just the ledger. A recorded
// preference that sessionStart ignores is worse than never asking.
// ============================================================

const MONDAY = '2026-08-10'

function seed(mutate: (d: ReturnType<typeof emptyAppData>) => void): string {
  const d = emptyAppData(MONDAY, MONDAY)
  d.settings.onboarded = true
  const week = defaultWeekState(MONDAY)
  week.tier = 1
  week.tierPickedAt = `${MONDAY}T08:00:00.000Z`
  d.weeks[MONDAY] = week
  mutate(d)
  return JSON.stringify(buildEnvelope(d))
}

async function boot(page: import('@playwright/test').Page, state: string) {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript((s) => localStorage.setItem('naod.state', s), state)
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await page.clock.runFor(1500)
}

/** Open the readiness sheet and tick the first two flags. */
async function twoFlags(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /Readiness check/ }).click()
  await expect(page.getByText('10-second readiness check')).toBeVisible()
  await page.getByText('Slept under 6 hours').click()
  await page.getByText('Legs sore or heavy').click()
}

test('two flags dial the day back by default', async ({ page }) => {
  await boot(page, seed(() => {}))
  await twoFlags(page)
  await expect(page.getByText(/the day downgrades/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start downgraded session' })).toBeVisible()
})

test('and stop doing so once the athlete says only when it is bad', async ({ page }) => {
  const state = seed((d) => {
    d.decisions = [
      {
        id: 'r1',
        type: 'readiness-threshold',
        target: 'flags',
        ruleVersion: 1,
        evidence: { unneededDowngrades: 4 },
        offeredAt: '2026-08-03',
        response: 'accepted',
        respondedAt: '2026-08-03',
      },
    ]
  })
  await boot(page, state)
  await twoFlags(page)
  // Same two flags, and now the day runs as written. The sheet has to
  // agree with the door: it used to hardcode its own 2.
  await expect(page.getByText(/under the line/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible()
})
