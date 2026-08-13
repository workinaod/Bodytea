import { test, expect, type Page } from '@playwright/test'

// ============================================================
// The set screen holds its shape.
//
// Extracting ExerciseBrief dropped `overflow-y-auto` from the
// how-to block. It then sized itself to its own content, ran off
// the bottom of the column, and painted over the weight stepper:
// the stepper looked washed out and would not take a tap, because
// the numbered steps were sitting on top of it.
//
// Nothing caught that. A screenshot would not have either, since
// the stepper was still visible, just unreachable. So this checks
// the two things that actually broke: the block scrolls, and the
// point under the + button really is the + button.
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: 'Something else' }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText('🎯 All-round fitness').click()
  await page.getByPlaceholder(/before my wedding/).fill('stay dangerous year-round')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
}

test('the how-to scrolls and the stepper is reachable', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await page.getByRole('button', { name: /Start session/ }).first().click()
  await page.clock.runFor(500)
  await page.getByText('Full session').click()
  await page.clock.runFor(1500)
  await page.waitForTimeout(800)

  // 1. The how-to block must actually be a scroller with room to move.
  const scroll = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find(
      (d) => d.scrollHeight > d.clientHeight + 4 && getComputedStyle(d).overflowY === 'auto',
    )
    return el ? { scrollH: el.scrollHeight, clientH: el.clientHeight } : null
  })
  expect(scroll, 'the how-to block should scroll, not overflow').not.toBeNull()

  // 2. Nothing may cover the weight stepper: the point under the + button
  //    must be the + button.
  const plus = page.getByRole('button', { name: 'Increase' }).first()
  const box = (await plus.boundingBox())!
  const onTop = await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y) as HTMLElement
      return { tag: el?.tagName, text: (el?.textContent ?? '').slice(0, 24) }
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  )
  // Hit-testing, not visibility: the old bug left the stepper on
  // screen and simply buried it.
  expect(onTop.tag, 'something is covering the weight stepper').toBe('BUTTON')

  // 3. And it must actually change the weight.
  const readWeight = () =>
    page.evaluate(() => {
      const inc = Array.from(document.querySelectorAll('button')).find(
        (b) => b.getAttribute('aria-label') === 'Increase',
      )
      const input = inc?.parentElement?.querySelector('input') as HTMLInputElement | null
      return input?.value ?? ''
    })
  const before = await readWeight()
  await plus.click()
  await page.waitForTimeout(250)
  const after = await readWeight()
  expect(after, 'tapping + should change the weight').not.toBe(before)
})
