import { test, expect, type Page } from '@playwright/test'

// ============================================================
// Voice commands land on the first interim, and only once.
//
// The recognizer only emits a FINAL result once it decides the
// utterance is over, which means waiting out the trailing silence.
// That pause is what made saying "done" feel ignored. We act on
// interims now, which means the same utterance keeps arriving
// after we have already acted on it: once per interim, then again
// as the final. Acting twice on one "done" would mark two sets
// complete and silently skip one, so the guard matters more than
// the speed-up.
// ============================================================

async function onboard(page: Page) {
  await page.getByRole('button', { name: 'Something else' }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
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

/** A recognizer we drive by hand, exposed on window for the test. */
async function fakeEars(page: Page) {
  await page.addInitScript(() => {
    type Res = { 0: { transcript: string }; isFinal: boolean; length: number }
    class FakeRecognition {
      continuous = false
      interimResults = false
      lang = ''
      onresult: ((e: { resultIndex: number; results: Res[] }) => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      private results: Res[] = []
      start() {
        ;(window as unknown as { __ears: FakeRecognition }).__ears = this
      }
      stop() {}
      /** Push one more transcript for the utterance at `index`. */
      hear(index: number, transcript: string, isFinal: boolean) {
        this.results[index] = { 0: { transcript }, isFinal, length: 1 }
        this.onresult?.({ resultIndex: index, results: this.results })
      }
    }
    ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition
    ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition =
      FakeRecognition
  })
}

test('one spoken "done" advances exactly one set', async ({ page }) => {
  test.setTimeout(120_000)
  await fakeEars(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')
  await onboard(page)
  await page.getByRole('button', { name: /Start session/ }).first().click()
  await page.clock.runFor(500)
  await page.getByText('Full session').click()
  await page.clock.runFor(1500)

  // Turn the ears on, then run a set so "done" has something to finish.
  await page.getByRole('button', { name: 'Voice control' }).click()
  await page.clock.runFor(500)
  await page.getByRole('button', { name: /GO · START SET/ }).first().click()
  await page.clock.runFor(4000)
  await page.waitForTimeout(300)

  // Counted from state, not from a label: this must be exact.
  const doneSets = async () => {
    await page.clock.runFor(1000)
    return page.evaluate(() => {
      const raw = localStorage.getItem('naod.state')
      if (!raw) return -1
      const env = JSON.parse(raw)
      const d = env.data ?? env
      let n = 0
      for (const s of Object.values(d.sessions) as { exercises: { sets: { done: boolean }[] }[] }[]) {
        for (const ex of s.exercises) for (const set of ex.sets) if (set.done) n++
      }
      return n
    })
  }
  const before = await doneSets()

  // One utterance, arriving the way a real recognizer delivers it:
  // growing interims, then the final. All at the same result index.
  await page.evaluate(() => {
    const ears = (window as unknown as { __ears?: { hear: (i: number, t: string, f: boolean) => void } }).__ears
    ears?.hear(0, 'i', false)
    ears?.hear(0, "i'm", false)
    ears?.hear(0, "i'm done", false)
    ears?.hear(0, "i'm done", true)
  })
  await page.clock.runFor(3000)
  await page.waitForTimeout(400)

  const after = await doneSets()
  expect(before).toBeGreaterThanOrEqual(0)
  expect(after, 'one spoken "done" must complete exactly one set').toBe(before + 1)
})
