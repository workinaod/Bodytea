import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    // Chromium-based mobile profile (this environment bundles Chromium only)
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173/Bodytea/',
    headless: true,
    // Pre-installed browser; overridable for machines with a normal install.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/Bodytea/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
