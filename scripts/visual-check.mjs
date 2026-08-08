// Visual smoke: drive the built app through onboarding and every tab,
// screenshotting each state so rendering issues are visible.
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:4173/Bodytea/'
const OUT = process.env.OUT_DIR ?? '.'

// PLAYWRIGHT_BROWSERS_PATH is set in this environment; fall back to the wrapper.
const browser = await chromium.launch().catch(() =>
  chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }),
)
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text())
})
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.screenshot({ path: `${OUT}/01-onboarding.png` })

// Walk onboarding
await page.getByText('Set it up (60 seconds)').click()
await page.screenshot({ path: `${OUT}/02-phase-start.png` })
await page.getByText('Next — baseline numbers').click()
await page.getByText('Last step').click()
await page.screenshot({ path: `${OUT}/03-final-step.png` })
await page.getByText("Let's work.").click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/04-today.png` })

// Tabs
for (const [label, file] of [
  ['Week', '05-week.png'],
  ['Meals', '06-meals.png'],
  ['Progress', '07-progress.png'],
  ['Coach', '08-coach.png'],
]) {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: false })
}

// Meals: tap a template chip and check the ring moves
await page.getByRole('button', { name: 'Meals', exact: true }).click()
await page.waitForTimeout(200)
const chip = page.locator('text=Breakfast —').first()
if (await chip.count()) {
  await chip.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/09-meals-logged.png` })
}

// Today: open an exercise guide via preview "?" button
await page.getByRole('button', { name: 'Today', exact: true }).click()
await page.waitForTimeout(300)
const q = page.locator('button:has-text("?")').first()
if (await q.count()) {
  await q.click()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${OUT}/10-guide.png` })
}

await browser.close()
console.log('VISUAL CHECK DONE')
