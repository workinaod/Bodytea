import { test, expect } from '@playwright/test'
import { DEMO_PHOTOS } from '../src/plan/demoPhotos'
import { EXERCISE_DEMOS } from '../src/plan/demos'
import { EXERCISES } from '../src/plan/exercises'

// ============================================================
// Copy that fits.
//
// The yellow cue gets two lines, the orange caption gets one,
// and the numbered steps underneath carry the detail. The
// character limits in plan/visuals.test.ts are the fast guard,
// but a character count is only a proxy: "Lean from the ANKLES,
// one straight line" and "Drive the ground back, don't pop up"
// are the same length and wrap differently.
//
// So this measures the real strings in a real browser, in the
// real font, at the real box widths, at 390px. The control
// string at the top proves the ruler can still report a wrap;
// without it a broken measurement would report a clean pass,
// which is exactly what happened the first time this was written.
// ============================================================

test('every cue and caption fits its box on a 390px screen', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await page.waitForTimeout(1500) // let the webfont load

  const captions = [
    ...Object.values(DEMO_PHOTOS).flatMap((s) => s.frames.map((f) => f.caption)),
    ...Object.values(EXERCISE_DEMOS).flatMap((d) => d.frames.map((f) => f.label ?? '')),
  ].filter(Boolean)
  const cues = Object.values(EXERCISES).map((e) => e.cue ?? '').filter(Boolean)
  expect(captions.length).toBeGreaterThan(100)
  expect(cues.length).toBeGreaterThan(50)

  const bad = await page.evaluate(
    ({ captions, cues }) => {
      const fam = "'Space Grotesk', system-ui, sans-serif"
      function lines(text: string, width: number, size: number) {
        const box = document.createElement('div')
        box.style.cssText =
          `position:fixed;left:-9999px;top:0;width:${width}px;font-weight:700;` +
          `font-size:${size}px;font-family:${fam};line-height:1.375;text-align:center;`
        box.textContent = text
        document.body.appendChild(box)
        // One line is exactly one line-height tall, so the height IS the count.
        const n = Math.round(box.getBoundingClientRect().height / (size * 1.375))
        box.remove()
        return n
      }
      // Sanity: the ruler must be able to report more than one line, or a
      // clean result below means nothing.
      const control = lines('word '.repeat(40), 179, 10.5)
      if (control < 3) return [{ kind: 'BROKEN RULER', text: `control measured ${control} lines`, lines: control }]

      const out: { kind: string; text: string; lines: number }[] = []
      // Caption: the compact split column, the tightest place it renders.
      for (const t of captions) {
        const n = lines(t, 179, 10.5)
        if (n > 1) out.push({ kind: 'caption', text: t, lines: n })
      }
      // Cue: centred in the focus column.
      for (const t of cues) {
        const n = lines(t, 306, 13)
        if (n > 2) out.push({ kind: 'cue', text: t, lines: n })
      }
      return out
    },
    { captions, cues },
  )

  console.log(`measured ${captions.length} captions, ${cues.length} cues`)
  if (bad.length) console.log(JSON.stringify(bad, null, 2))
  expect(bad).toEqual([])
})
