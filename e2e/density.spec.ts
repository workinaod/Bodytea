import { expect, test, type Page } from '@playwright/test'
import { onboardGenerated } from './util'

// ============================================================
// A redesign is an EDIT.
//
// The concept draws every screen as a short stack of tiles, one
// idea each. The build read that as a list of things to ADD,
// added them on top of the screens that were already there, and
// every screen got longer: Progress shipped 24 top-level blocks
// against the concept's 12, Today 12 against 9. The two screens
// built from nothing, Train and Profile, came out right.
//
// The owner caught it by looking, which is the only reason it
// was caught at all. So it gets a number.
//
// These caps are in research/OP12-screen-law.md next to each
// screen's contents. They SHRINK, never grow. A screen that
// needs another block earns it by absorbing two.
// ============================================================

interface Screen {
  /** Tab button label, plus a segment to click once the tab is open. */
  tab: string
  segment?: string
  cap: number
  /**
   * My Plan hosts a whole screen inside its own last block, so counting
   * its top-level children would report 3 and measure nothing. The
   * embedded screen's blocks are the ones actually on the glass.
   */
  flattenLast?: boolean
}

const SCREENS: Screen[] = [
  { tab: 'Today', cap: 9 },
  { tab: 'Train', cap: 9 },
  { tab: 'Plan', cap: 8, flattenLast: true },
  { tab: 'Plan', segment: 'Nutrition', cap: 8, flattenLast: true },
  { tab: 'Progress', cap: 12 },
  { tab: 'Profile', cap: 8 },
]

/** Top-level children of the tab's screen container. */
async function blocks(page: Page, flattenLast: boolean): Promise<string[]> {
  return page.evaluate((flatten) => {
    const root = document.querySelector('div[style*="rise"]')?.firstElementChild
    if (!root) throw new Error('screen container not found')
    const kids = Array.from(root.children)
    const flat =
      flatten && kids.length > 0
        ? [...kids.slice(0, -1), ...Array.from(kids[kids.length - 1].children)]
        : kids
    return flat.map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60))
  }, flattenLast)
}

test('no screen is longer than the concept draws it', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboardGenerated(page)
  await page.waitForTimeout(400)

  for (const s of SCREENS) {
    const name = s.segment ? `${s.tab} · ${s.segment}` : s.tab
    if (s.tab !== 'Today') {
      await page.getByRole('button', { name: s.tab, exact: true }).click()
      await page.waitForTimeout(400)
    }
    if (s.segment) {
      await page.getByRole('button', { name: s.segment, exact: true }).click()
      await page.waitForTimeout(400)
    }
    const found = await blocks(page, !!s.flattenLast)
    expect(
      found.length,
      `${name} renders ${found.length} top-level blocks, the concept draws ${s.cap}. ` +
        `A redesign is an edit; absorb something rather than stacking another one.\n` +
        found.map((b, i) => `  ${i + 1}. ${b}`).join('\n'),
    ).toBeLessThanOrEqual(s.cap)
  }
})
