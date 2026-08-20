import { expect, test, type Page } from '@playwright/test'

// Booklet flows: bring-your-own-routine and fine-tune-the-generated-booklet.
test.describe.configure({ mode: 'serial' })

/** Shared wizard head: welcome → name → goal. */
async function throughGoal(page: Page, entry: string, chip: string, statement: string) {
  await page.getByRole('button', { name: entry }).click()
  await page.locator('input').first().fill('Sam')
  await page.getByRole('button', { name: 'Male', exact: true }).click()
  await page.getByPlaceholder('Age').fill('30')
  await page.getByLabel('Height').fill('510')
  await page.getByLabel('Weight').fill('180')
  await page.getByRole('button', { name: 'Next: the goal' }).click()
  await page.getByText(chip).click()
  await page.locator('textarea').first().fill(statement)
}

test('bring your own routine: build week → notes → track it', async ({ page }) => {
  // Monday Aug 10 2026, the built day lands on "today"
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  // Multi-select routine goals: muscle + athleticism together
  await throughGoal(page, 'I already have a routine', '💪 Gaining muscle', 'add 10 lb of lean muscle')
  await page.getByText('⚡ Gaining athleticism').click()
  await page.getByRole('button', { name: 'Next: build my week' }).click()

  // Empty week fails validation with a clear message
  await expect(page.getByRole('heading', { name: 'Build your week' })).toBeVisible()
  await page.getByRole('button', { name: "My routine's in, next" }).click()
  await expect(page.getByText('Add at least one training day to the week.')).toBeVisible()

  // Assemble Monday from the 77-exercise picker
  await page.getByRole('button', { name: '+ add a training day' }).first().click()
  await expect(page.getByText('Edit day')).toBeVisible()
  await page.getByRole('textbox').first().fill('Full Body A')
  for (const [query, name] of [
    ['Goblet', 'Goblet Squat'],
    ['Romanian', 'DB Romanian Deadlift'],
    ['One-Arm', 'One-Arm DB Row'],
  ] as const) {
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder(/Search a name, a muscle/).fill(query)
    await page.getByRole('button', { name: new RegExp(name) }).first().click()
  }
  await page.getByRole('button', { name: 'Done with this day' }).click()
  await expect(page.getByRole('button', { name: /Full Body A/ })).toBeVisible()
  await expect(page.getByText('3 exercises')).toBeVisible()

  // The coach asks WHY it's been working before writing notes
  await page.getByRole('button', { name: "My routine's in, next" }).click()
  await expect(page.getByRole('heading', { name: 'Why has this routine been working for you?' })).toBeVisible()
  await page.getByPlaceholder(/I never miss/).fill('my squat keeps going up because I add weight every week')
  await page.getByRole('button', { name: 'Give me the notes' }).click()

  // Notes: their claim on top, the honest read below
  await expect(page.getByRole('heading', { name: 'Straight notes, no fluff' })).toBeVisible()
  await expect(page.getByText('Your read', { exact: true })).toBeVisible()
  await expect(page.getByText(/progressive overload, the one lever/)).toBeVisible()
  await expect(page.getByText(/posterior chain gets its work/)).toBeVisible()
  // athletic goal + zero jump work → called out
  await expect(page.getByText(/jumps and sprints ARE the engine/)).toBeVisible()
  await expect(page.getByText(/automatic deload/)).toBeVisible()

  await page.getByRole('button', { name: "Start Week 1" }).click()

  // Bring-your-own-routine reaches the permissions screen too. It used
  // to commit straight from the notes, which made it the one path never
  // asked for notifications, motion or location at all.
  await expect(page.getByRole('heading', { name: 'Last thing' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip' }).click()

  // Today runs THEIR routine
  await expect(page.getByText(/Week 1/).first()).toBeVisible()
  await expect(page.getByText('Full Body A').first()).toBeVisible()

  // 🔄 can't do goblet squats today → one tap swaps in an equivalent,
  // and the swap sticks for the date across reloads
  await page.getByRole('button', { name: 'Swap Goblet Squat' }).click()
  await expect(page.getByText('Split Squat')).toBeVisible()
  await expect(page.getByText('swapped')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Split Squat')).toBeVisible()

  // Notes + their on-record claim landed in the coach feed
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(page.getByText(/Routine notes:/).first()).toBeVisible()
  await expect(page.getByText(/On record, why your routine works/)).toBeVisible()
  await page.getByText(/My Booklet · My Routine/).click()
  await expect(page.getByRole('heading', { name: 'My Booklet' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Full Body A/ })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'My Booklet' })).not.toBeVisible()
})

test('generated booklet: fine-tune before starting', async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await throughGoal(page, "Let's get started", 'Jump higher', 'dunk on a 10-ft rim by June')
  await page.getByRole('button', { name: 'Next: a few questions' }).click()
  await page.getByRole('button', { name: 'Next: my week' }).click()
  await page.getByRole('button', { name: '6 days' }).click()
  await page.getByRole('button', { name: 'Next: my gear' }).click()
  await page.getByRole('button', { name: 'Next: experience' }).click()
  await page.getByRole('button', { name: 'Next: food' }).click()
  await page.getByRole('button', { name: 'Build my plan' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByText('Jump Higher · 6-Day')).toBeVisible()

  await page.getByRole('button', { name: /Fine-tune it first/ }).click()
  await expect(page.getByRole('heading', { name: 'Fine-tune your booklet' })).toBeVisible()

  // Rename the booklet, then lock it in
  const nameInput = page.getByRole('textbox').first()
  await expect(nameInput).toHaveValue('Jump Higher · 6-Day')
  await nameInput.fill('My Dunk Plan')
  await page.getByRole('button', { name: 'Lock it in, start Week 1' }).click()

  await expect(page.getByText(/Week 1/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(page.getByText(/My Booklet · My Dunk Plan/)).toBeVisible()
})

test('a routine brought from home can also declare a bad knee', async ({ page }) => {
  // R17's highest-severity finding, and it was not the importer. Every
  // athlete who brought their own routine was committed with
  // prefs.limitations = [], because "Anything that hurts right now?"
  // lives on a screen the routine path never reaches. The question was
  // asked of exactly half the userbase, under a comment in commitPlan
  // promising that a bad knee is a bad knee whichever way the plan
  // arrived.
  //
  // This runs the same flow as the test above, declares a knee, and then
  // asks for a swap. What comes back has to be something that does not
  // load the knee, which is the W7p limit-range behaviour reaching an
  // athlete it could never reach before.
  await page.clock.install({ time: new Date(2026, 7, 10, 9, 0) })
  await page.goto('./')

  await throughGoal(page, 'I already have a routine', '💪 Gaining muscle', 'add 10 lb of lean muscle')
  await page.getByRole('button', { name: 'Next: build my week' }).click()

  await page.getByRole('button', { name: '+ add a training day' }).first().click()
  await page.getByRole('textbox').first().fill('Full Body A')
  for (const [query, name] of [
    ['Goblet', 'Goblet Squat'],
    ['Romanian', 'DB Romanian Deadlift'],
    ['One-Arm', 'One-Arm DB Row'],
  ] as const) {
    await page.getByRole('button', { name: '+ Add exercise' }).click()
    await page.getByPlaceholder(/Search a name, a muscle/).fill(query)
    await page.getByRole('button', { name: new RegExp(name) }).first().click()
  }
  await page.getByRole('button', { name: 'Done with this day' }).click()
  await page.getByRole('button', { name: "My routine's in, next" }).click()

  // The question this path never asked, on the screen it now asks it.
  await expect(page.getByText('Anything that hurts right now?')).toBeVisible()
  await page.getByRole('button', { name: 'Knees', exact: true }).click()
  await page.getByRole('button', { name: 'Give me the notes' }).click()

  await page.getByRole('button', { name: 'Start Week 1' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()

  // Their own routine still runs. The app does not rewrite what they
  // brought; the knee only changes what it offers when THEY ask.
  await expect(page.getByText('Full Body A').first()).toBeVisible()
  await page.getByRole('button', { name: 'Swap Goblet Squat' }).click()
  await expect(page.getByText('swapped')).toBeVisible()
  // The same swap without a declared knee returns a split squat, which
  // loads it. With one declared, it must not.
  await expect(page.getByText('Split Squat')).toHaveCount(0)
})
