import { expect, test } from '@playwright/test'

// The Account sheet lazy-loads the cloud module (supabase-js chunk).
// Everything here runs offline-safe: no network call happens until a
// form is actually submitted, so this proves the dynamic-import wiring
// and the signed-out UI without touching the real backend.
test('account sheet: cloud module lazy-loads and the signed-out flow renders', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  // Fastest onboard: generated plan with defaults
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

  await page.getByRole('button', { name: 'Coach', exact: true }).click()
  // Account and backup moved inside Settings: one header button now.
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: /^Account/ }).click()

  // Signed-out menu (cloud chunk loaded, session restore ran, no session)
  await expect(page.getByText(/cloud backup/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Create my account' }).click()
  await expect(page.getByPlaceholder('Phone number')).toBeVisible()
  await expect(page.getByPlaceholder(/Username/)).toBeVisible()

  // Client-side validation fires without any network
  await page.getByPlaceholder('Phone number').fill('123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Enter a real phone number.')).toBeVisible()

  // Sign-in view + recovery path are reachable
  await page.getByRole('button', { name: 'back', exact: true }).click()
  await page.getByRole('button', { name: 'I have one, sign in' }).click()
  await page.getByRole('button', { name: /Forgot my PIN/ }).click()
  await expect(page.getByPlaceholder(/Recovery code/)).toBeVisible()
})
