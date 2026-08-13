import { expect, test, type Page } from '@playwright/test'

// The unit tests prove speakable() transforms strings. This proves the
// coach actually routes its real lines through it, in a real browser,
// against a real generated plan. Headless Chromium has no speech engine,
// so speechSynthesis is replaced with a recorder before the app boots.

async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    class FakeUtterance {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      voice: unknown = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    }
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance =
      FakeUtterance
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => [],
        cancel: () => {},
        speak: (u: FakeUtterance) => {
          spoken.push(u.text)
          // Drive the queue forward the way a real engine would.
          setTimeout(() => u.onend?.(), 0)
        },
        addEventListener: () => {},
      },
    })
  })
}


/**
 * Into the first set. CNS days gate behind a readiness check, ordinary
 * days behind an intensity pick, so this handles both.
 */
async function startSession(page: Page) {
  const readiness = page.getByRole('button', { name: /Readiness check → start/ })
  if (await readiness.isVisible().catch(() => false)) {
    await readiness.click()
    await page.getByRole('button', { name: /^Start session$/ }).click()
  } else {
    await page.getByRole('button', { name: 'Start session', exact: true }).click()
    await page.getByRole('button', { name: /^Full session/ }).click()
  }
  await expect(page.getByRole('button', { name: /^GO · START SET/ })).toBeVisible()
  // The sequencer deliberately waits a tick after cancel() before speaking
  // (the iOS clipping bug), and chains chunks with real gaps. Under the
  // installed clock those timers only fire when the test advances it.
  await page.clock.runFor(3000)
}

const spokenText = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' ⏐ '))

test('the coach speaks English, not shorthand', async ({ page }) => {
  await recordSpeech(page)
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  // A strength goal, so the session is full of loaded lifts with ranges
  await page.getByRole('button', { name: /Get strong again/ }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '4 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()

  await startSession(page)

  const said = await spokenText(page)
  expect(said.length).toBeGreaterThan(0)

  // None of the robot tells survive into what gets spoken
  expect(said).not.toMatch(/\bDB\b/) // "dee bee"
  expect(said).not.toMatch(/\bOHP\b|\bRDL\b|\bKB\b|\bMB\b/)
  expect(said).not.toMatch(/\d\s*[-–]\s*\d/) // "eight hyphen twelve"
  expect(said).not.toMatch(/\d\s*[×x]\s*\d/) // "three ex five"
  expect(said).not.toMatch(/\//) // "slash side"
  expect(said).not.toMatch(/\d\s*(yd|sec|lb|mi)\b/) // "why dee", "sek"

  // And the requested closing line is there, in one piece
  expect(said).toMatch(/tell me when you're ready/)
})

test('the set intro is several utterances, not one flat sentence', async ({ page }) => {
  await recordSpeech(page)
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await page.getByRole('button', { name: /Get strong again/ }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '4 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: "Start Week 1, let's work" }).click()
  await startSession(page)

  const spoken = await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)

  // The name, the set line and the prompt arrive as separate utterances so
  // each gets its own rise and fall, and the gaps read as breathing.
  expect(spoken.length).toBeGreaterThan(1)
  // No single utterance carries two finished sentences.
  for (const line of spoken) {
    expect(line.replace(/[.!?]\s*$/, ''), line).not.toMatch(/[.!?]\s+\S/)
  }
})
