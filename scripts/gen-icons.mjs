// Generate PWA PNG icons from the favicon SVG using the bundled Chromium.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const logo = (pad) => `<!doctype html><html><body style="margin:0">
<div style="width:512px;height:512px;background:#09090f;display:flex;align-items:center;justify-content:center">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" style="width:${512 - pad * 2}px;height:${512 - pad * 2}px">
    <path d="M14 46V18h6l16 19V18h6v28h-6L20 27v19z" fill="#ff5c1f"/>
    <rect x="14" y="50" width="36" height="4" rx="2" fill="#b8f542"/>
  </svg>
</div></body></html>`

mkdirSync('public/icons', { recursive: true })
const browser = await chromium.launch().catch(() =>
  chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }),
)
const page = await browser.newPage({ viewport: { width: 512, height: 512 } })

const jobs = [
  { file: 'public/icons/pwa-512.png', pad: 64, size: 512 },
  { file: 'public/icons/pwa-192.png', pad: 64, size: 192 },
  { file: 'public/icons/maskable-512.png', pad: 128, size: 512 }, // 80% safe zone
  { file: 'public/icons/apple-touch-icon.png', pad: 96, size: 180 },
]

for (const j of jobs) {
  await page.setContent(logo(j.pad))
  const el = page.locator('div').first()
  const buf = await el.screenshot({ type: 'png' })
  if (j.size !== 512) {
    // rescale via a second page render of the captured image
    const b64 = buf.toString('base64')
    await page.setContent(
      `<body style="margin:0"><img src="data:image/png;base64,${b64}" style="width:${j.size}px;height:${j.size}px;display:block"/></body>`,
    )
    await page.locator('img').screenshot({ path: j.file })
  } else {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(j.file, buf)
  }
  console.log('wrote', j.file)
}

await browser.close()
