import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// ============================================================
// The approved SCREENS, guarded the way the palette is.
//
// src/visualLaw.test.ts caught a session that rebuilt the
// colours from memory. The same failure then happened one
// layer up: the palette was right and the screens were still
// the old screens wearing new paint. The owner spotted it in
// one question: "The preview showed a whole different plan for
// this page, is that later in the roadmap and we are just
// adjusting colors rn?"
//
// So the contents are written down in research/OP12-screen-law.md
// and this asserts they are actually on the screens. These are
// landmarks, not pixels: a section that exists can be improved,
// a section that was never built cannot.
//
// If a landmark genuinely has to go, it comes out of the law
// file in the same commit. Drift fails; an intentional change
// is one edit away.
// ============================================================

const ROOT = join(import.meta.dirname, '..')
const LAW = 'research/OP12-screen-law.md'

function src(rel: string): string {
  const p = join(ROOT, 'src', rel)
  return existsSync(p) ? readFileSync(p, 'utf8') : ''
}

/** Every file that together makes up one screen, concatenated. */
function screen(...rels: string[]): string {
  return rels.map(src).join('\n')
}

function has(body: string, needle: string, where: string) {
  expect(
    body.includes(needle),
    `"${needle}" is missing from ${where}. It is part of the approved screen; see ${LAW}.`,
  ).toBe(true)
}

describe('the approved screens', () => {
  it('has the shared surface vocabulary the whole look is built from', () => {
    const ui = screen('components/ui/Surface.tsx', 'components/ui/Data.tsx', 'components/ui/index.ts')
    for (const part of ['Tile', 'Coin', 'SetCoin', 'SectionTitle', 'QBar', 'WeekNode']) {
      has(ui, part, 'components/ui')
    }
    expect(
      existsSync(join(ROOT, 'src/components/stickers.tsx')),
      `components/stickers.tsx is missing: the concept's icons are flat 2-tone stickers, ` +
        `not line glyphs. See ${LAW}.`,
    ).toBe(true)
  })

  it('Today carries the mission tile, the path, the pull and the work', () => {
    const today = screen(
      'screens/today/TodayScreen.tsx',
      'screens/today/TodayHero.tsx',
      'screens/today/TodayIdentityRow.tsx',
      'screens/today/TodayNextUp.tsx',
      'screens/today/TodayPreviewList.tsx',
      'screens/today/TodayCoachLine.tsx',
    )
    for (const part of ['Start session', "Can't train", 'Next up', 'All badges', 'The work', 'Push me']) {
      has(today, part, 'the Today screen')
    }
  })

  it('Today, complete, floods volt and hands over tomorrow', () => {
    const done = src('screens/today/TodayCompletion.tsx')
    for (const part of ['Mission complete', 'Tomorrow', 'Preview tomorrow']) {
      has(done, part, 'TodayCompletion')
    }
  })

  it('Train is the gym door the concept drew, library included', () => {
    const train = src('screens/train/TrainScreen.tsx')
    for (const part of [
      'Off the plan',
      'Conditioning',
      'Run a previous day',
      'Browse workouts',
      'Your own workout',
      'Exercise library',
      'Log cardio',
    ]) {
      has(train, part, 'TrainScreen')
    }
  })

  it('My Plan holds the whole program behind one switch', () => {
    const plan = screen(
      'screens/plan/MyPlanScreen.tsx',
      'screens/plan/PlanDoors.tsx',
      'screens/week/WeekScreen.tsx',
    )
    for (const part of ['Training', 'Nutrition', "This week's tier", 'The days', 'The Plan']) {
      has(plan, part, 'My Plan')
    }
  })

  it('Progress leads with the body and names the climb', () => {
    const prog = screen(
      'screens/progress/ProgressScreen.tsx',
      'screens/progress/ProgressBody.tsx',
      'screens/progress/RecordView.tsx',
    )
    for (const part of ['Your body this week', 'The Board', 'Record', 'The climb']) {
      has(prog, part, 'Progress')
    }
  })

  it('Profile is the identity hub, not a settings page', () => {
    const me = screen(
      'screens/profile/ProfileScreen.tsx',
      'screens/profile/ProfileStatsHeader.tsx',
      'screens/profile/MyRoomPreviewCard.tsx',
      'screens/profile/BadgeGrid.tsx',
    )
    for (const part of ['Trainee soon', 'Training path', 'Training pact', 'My Room', 'Badges']) {
      has(me, part, 'Profile')
    }
  })

  it('the badge view says what earns each one and when it was earned', () => {
    const grid = src('screens/profile/BadgeGrid.tsx')
    for (const part of ['Earned', 'Locked', 'before tracking']) {
      has(grid, part, 'BadgeGrid')
    }
  })
})
