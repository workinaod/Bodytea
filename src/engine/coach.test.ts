import { describe, expect, it } from 'vitest'
import { emptyAppData, type AppData, type ExcuseRecord } from '../types'
import {
  anyGigFlag,
  busyButMealsLogged,
  coachMessageFor,
  contradictionsOnSessionFinish,
  escalationLevel,
  excuseAccepted,
  fallbackWeekCount,
  gigSanctioned,
  interpolate,
  pickVariant,
} from './coach'
import { validateProofFile } from '../store/storage'
import { generateInsights } from './insights'
import { findUnexplainedMisses } from './reconcile'
import { composeDebrief } from './debrief'
import { defaultWeekState } from '../types'

const START = '2026-08-10'

function makeData(): AppData {
  const d = emptyAppData(START)
  d.settings.onboarded = true
  return d
}

function excuse(date: string, accepted: boolean, reason: ExcuseRecord['reason'] = 'busy'): ExcuseRecord {
  return {
    id: `x-${date}-${Math.random()}`,
    at: `${date}T10:00:00.000Z`,
    date,
    scope: 'day',
    action: 'skip',
    reason,
    accepted,
    minimumViableTaken: false,
    escalationLevelAtTime: 0,
  }
}

describe('interpolate + pickVariant', () => {
  it('interpolates known vars and leaves unknown ones visible', () => {
    expect(interpolate('{a} and {b}', { a: 1 })).toBe('1 and {b}')
  })

  it('picks unseen variants first, then least-recently-shown', () => {
    const variants = ['v0', 'v1', 'v2']
    let shown: string[] = []
    const p0 = pickVariant('pool', variants, shown)
    expect(p0.text).toBe('v0')
    shown = [...shown, p0.shownId]
    const p1 = pickVariant('pool', variants, shown)
    expect(p1.text).toBe('v1')
    shown = [...shown, p1.shownId, 'pool:2']
    // all seen now; pool:0 is oldest
    const p3 = pickVariant('pool', variants, shown)
    expect(p3.text).toBe('v0')
  })
})

describe('escalation', () => {
  it('counts only unproven excuses in the trailing 30 days', () => {
    const d = makeData()
    expect(escalationLevel(d.excuses, '2026-08-20')).toBe(0)
    d.excuses.push(excuse('2026-08-11', false))
    expect(escalationLevel(d.excuses, '2026-08-20')).toBe(1)
    d.excuses.push(excuse('2026-08-14', true)) // proof — doesn't count
    expect(escalationLevel(d.excuses, '2026-08-20')).toBe(1)
    d.excuses.push(excuse('2026-08-16', false))
    d.excuses.push(excuse('2026-08-18', false))
    expect(escalationLevel(d.excuses, '2026-08-20')).toBe(3)
    // old ones age out
    expect(escalationLevel(d.excuses, '2026-10-01')).toBe(0)
  })

  it('level-2 skip message cites the actual dates', () => {
    const d = makeData()
    d.excuses.push(excuse('2026-08-11', false))
    d.excuses.push(excuse('2026-08-14', false))
    const msg = coachMessageFor(d, 'skip-no-proof', '2026-08-20')
    expect(msg.poolId).toBe('skip-np-2')
    expect(msg.text).toMatch(/Aug/)
  })

  it('proof path uses the respectful pool with the protein target', () => {
    const d = makeData()
    const msg = coachMessageFor(d, 'skip-with-proof', '2026-08-20')
    expect(msg.text).toContain('200')
  })
})

describe('contradictions', () => {
  it('flags sick-yesterday + PR-today', () => {
    const d = makeData()
    d.excuses.push(excuse('2026-08-11', false, 'sick'))
    const session = {
      date: '2026-08-12',
      templateId: 'wednesday',
      status: 'completed' as const,
      exercises: [
        { exerciseId: 'front-squat', sets: [{ targetReps: '6-8', weightLb: 120, reps: 8, done: true }] },
      ],
    }
    d.sessions[session.date] = session
    const found = contradictionsOnSessionFinish(d, session, true)
    expect(found.some((c) => c.poolId === 'contradiction-sick-pr')).toBe(true)
  })

  it('flags unproven tier drop followed by a full session', () => {
    const d = makeData()
    const monday = START
    d.weeks[monday] = {
      ...defaultWeekState(monday),
      tier: 2,
      tierChanges: [{ at: `${monday}T09:00:00.000Z`, from: 1, to: 2 }],
    }
    const session = {
      date: '2026-08-12',
      templateId: 't2-upper',
      status: 'completed' as const,
      exercises: [
        { exerciseId: 'pull-up', sets: [{ targetReps: 'max', reps: 10, done: true }] },
      ],
    }
    d.sessions[session.date] = session
    const found = contradictionsOnSessionFinish(d, session, false)
    expect(found.some((c) => c.poolId === 'contradiction-tier-full')).toBe(true)
  })

  it('busy-but-meals-logged needs 4+ entries', () => {
    const d = makeData()
    d.meals['2026-08-12'] = {
      date: '2026-08-12',
      entries: Array.from({ length: 4 }, (_, i) => ({
        id: String(i),
        at: '',
        label: 'x',
        proteinG: 10,
        kcal: 100,
        source: 'chip' as const,
        servings: 1,
      })),
      supplements: { creatine: false, fishOil: false, vitD3: false, electrolytes: false },
    }
    expect(busyButMealsLogged(d, '2026-08-12')).toBe(true)
    expect(busyButMealsLogged(d, '2026-08-13')).toBe(false)
  })
})

describe('proof acceptance rules', () => {
  it('fresh images pass validation, stale and non-images fail', () => {
    const now = Date.now()
    expect(validateProofFile({ lastModified: now - 3600_000, type: 'image/png' }).ok).toBe(true)
    const stale = validateProofFile({ lastModified: now - 20 * 86400_000, type: 'image/jpeg' })
    expect(stale.ok).toBe(false)
    if (!stale.ok) {
      expect(stale.reason).toBe('stale')
      expect(stale.ageDays).toBe(20)
    }
    expect(validateProofFile({ lastModified: now, type: 'application/pdf' }).ok).toBe(false)
    // no timestamp → benefit of the doubt
    expect(validateProofFile({ type: 'image/jpeg' }).ok).toBe(true)
  })

  it('gig claims verify against life events marked in advance (day + day after)', () => {
    const week = { ...defaultWeekState('2026-08-10'), events: { dj: [5 as const] } }
    expect(gigSanctioned(week, '2026-08-14')).toBe(true) // Friday, event day
    expect(gigSanctioned(week, '2026-08-15')).toBe(true) // Saturday morning after — sanctioned too
    expect(gigSanctioned(week, '2026-08-12')).toBe(false) // Wednesday, nothing marked
    expect(gigSanctioned(undefined, '2026-08-14')).toBe(false)
    expect(anyGigFlag(week)).toBe(true)
    expect(anyGigFlag(defaultWeekState('2026-08-10'))).toBe(false)

    // Monday's "day after" lives in the PREVIOUS week (Sunday shift)
    const prevWeek = { ...defaultWeekState('2026-08-03'), events: { shift: [0 as const] } }
    expect(gigSanctioned(defaultWeekState('2026-08-10'), '2026-08-10', prevWeek)).toBe(true)
    expect(gigSanctioned(defaultWeekState('2026-08-10'), '2026-08-10')).toBe(false)
  })

  it('excuseAccepted: proof accepts; gig only with matching events; nothing else auto-accepts', () => {
    const week = { ...defaultWeekState('2026-08-10'), events: { dj: [6 as const] } }
    expect(excuseAccepted({ reason: 'busy', proofPhotoId: 'p1', week, date: '2026-08-12', scope: 'day' })).toBe(true)
    expect(excuseAccepted({ reason: 'busy', week, date: '2026-08-12', scope: 'day' })).toBe(false)
    expect(excuseAccepted({ reason: 'gig', week, date: '2026-08-15', scope: 'day' })).toBe(true) // Sat, marked
    expect(excuseAccepted({ reason: 'gig', week, date: '2026-08-12', scope: 'day' })).toBe(false) // Wed, not marked
    expect(excuseAccepted({ reason: 'gig', week, date: '2026-08-10', scope: 'week' })).toBe(true) // any event covers the week scope
    // travel/sick no longer auto-accept without proof
    expect(excuseAccepted({ reason: 'travel', week, date: '2026-08-10', scope: 'week' })).toBe(false)
    expect(excuseAccepted({ reason: 'sick', week, date: '2026-08-12', scope: 'day' })).toBe(false)
  })
})

describe('tier-drop record hygiene', () => {
  async function withDrop() {
    const { pruneTierDropFeed, pruneTierDropExcuses, trainedInDroppedTier } = await import('./coach')
    const d = makeData()
    const monday = '2026-08-10'
    d.weeks[monday] = {
      ...defaultWeekState(monday),
      tier: 2,
      tierChanges: [{ at: '2026-08-11T09:00:00.000Z', from: 1, to: 2, excuseId: 'x-drop' }],
    }
    d.excuses.push({
      id: 'x-drop', at: '2026-08-11T09:00:00.000Z', date: monday, scope: 'week',
      action: 'tier-drop', reason: 'busy', claimText: 'Inventory week, three doubles.',
      accepted: true, minimumViableTaken: false, escalationLevelAtTime: 0,
    })
    d.coach.feed.push({
      id: 'f1', at: '2026-08-11T09:00:00.000Z', kind: 'coach',
      situation: 'tier-drop-planned', text: 'Tier 2 locked.', weekISO: monday, excuseId: 'x-drop',
    })
    return { d, monday, pruneTierDropFeed, pruneTierDropExcuses, trainedInDroppedTier }
  }

  it('an untrained revert wipes the feed and the excuse', async () => {
    const { d, monday, pruneTierDropFeed, pruneTierDropExcuses, trainedInDroppedTier } = await withDrop()
    expect(trainedInDroppedTier(d, monday)).toBe(false)
    pruneTierDropFeed(d, monday)
    pruneTierDropExcuses(d, monday)
    expect(d.coach.feed.length).toBe(0)
    expect(d.excuses.length).toBe(0)
  })

  it('training in the dropped tier makes the record permanent', async () => {
    const { d, monday, trainedInDroppedTier } = await withDrop()
    d.sessions['2026-08-12'] = { date: '2026-08-12', templateId: 't2-upper', status: 'completed', exercises: [] }
    expect(trainedInDroppedTier(d, monday)).toBe(true)
    // a session BEFORE the drop doesn't count
    const d2 = (await withDrop()).d
    d2.sessions['2026-08-10'] = { date: '2026-08-10', templateId: 'monday', status: 'completed', exercises: [] }
    expect(trainedInDroppedTier(d2, monday)).toBe(false)
  })

  it('prune only touches the targeted week', async () => {
    const { d, monday, pruneTierDropFeed } = await withDrop()
    d.coach.feed.push({ id: 'f2', at: '2026-08-04T09:00:00.000Z', kind: 'coach', situation: 'tier-drop-planned', text: 'Older week.', weekISO: '2026-08-03' })
    pruneTierDropFeed(d, monday)
    expect(d.coach.feed.map((f) => f.id)).toEqual(['f2'])
  })
})

describe('fallback week monitor', () => {
  it('counts tier 2/3 weeks in the trailing window', () => {
    const d = makeData()
    // build 4 fallback weeks ending at 2026-09-07 (a Monday)
    const mondays = ['2026-09-07', '2026-08-31', '2026-08-24', '2026-08-17']
    for (const m of mondays) d.weeks[m] = { ...defaultWeekState(m), tier: 2 }
    expect(fallbackWeekCount(d, '2026-09-09', 5)).toBe(4)
  })
})

describe('insights', () => {
  it('fires recomp-waist-down on flat weight + shrinking waist, then cools down', () => {
    const d = makeData()
    d.measurements = [
      { date: '2026-08-16', weightLb: 197, waistIn: 36.5, photoIds: {} },
      { date: '2026-08-30', weightLb: 197.5, waistIn: 36.2, photoIds: {} },
      { date: '2026-09-13', weightLb: 196.8, waistIn: 35.9, photoIds: {} },
    ]
    const insights = generateInsights(d, '2026-09-14')
    const waist = insights.find((i) => i.ruleId === 'recomp-waist-down')
    expect(waist).toBeDefined()
    expect(waist!.text).toMatch(/waist/i)

    d.coach.surfacedInsights['recomp-waist-down'] = '2026-09-14'
    const again = generateInsights(d, '2026-09-15')
    expect(again.find((i) => i.ruleId === 'recomp-waist-down')).toBeUndefined()
  })

  it('fires strength-up-vert-flat only with both conditions', () => {
    const d = makeData()
    d.sessions['2026-08-12'] = {
      date: '2026-08-12',
      templateId: 'wednesday',
      status: 'completed',
      exercises: [{ exerciseId: 'front-squat', sets: [{ targetReps: '6-8', weightLb: 100, reps: 8, done: true }] }],
    }
    d.sessions['2026-09-09'] = {
      date: '2026-09-09',
      templateId: 'wednesday',
      status: 'completed',
      exercises: [{ exerciseId: 'front-squat', sets: [{ targetReps: '6-8', weightLb: 115, reps: 8, done: true }] }],
    }
    d.measurements = [
      { date: '2026-08-16', vertIn: 24, photoIds: {} },
      { date: '2026-08-30', vertIn: 24.2, photoIds: {} },
      { date: '2026-09-13', vertIn: 24.3, photoIds: {} },
    ]
    const insights = generateInsights(d, '2026-09-14')
    expect(insights.find((i) => i.ruleId === 'strength-up-vert-flat')).toBeDefined()

    // vert climbing → rule goes quiet, vert-up fires instead
    d.measurements[2] = { date: '2026-09-13', vertIn: 26, photoIds: {} }
    const insights2 = generateInsights(d, '2026-09-14')
    expect(insights2.find((i) => i.ruleId === 'strength-up-vert-flat')).toBeUndefined()
    expect(insights2.find((i) => i.ruleId === 'vert-up')).toBeDefined()
  })

  it('flags a weak protein week with real numbers', () => {
    const d = makeData()
    for (let i = 1; i <= 7; i++) {
      const date = `2026-08-${String(10 + i).padStart(2, '0')}`
      d.meals[date] = {
        date,
        entries: [{ id: 'e', at: '', label: 'snack', proteinG: i <= 2 ? 210 : 90, kcal: 800, source: 'chip', servings: 1 }],
        supplements: { creatine: false, fishOil: false, vitD3: false, electrolytes: false },
      }
    }
    const insights = generateInsights(d, '2026-08-18')
    expect(insights.find((i) => i.ruleId === 'protein-week-weak')).toBeDefined()
  })
})

describe('reconcile', () => {
  it('finds unexplained misses, oldest first, honoring day and week excuses', () => {
    const d = makeData()
    // week 1 passes: Mon logged, Tue excused (day), Wed–Sat missing
    d.sessions['2026-08-10'] = { date: '2026-08-10', templateId: 'monday', status: 'completed', exercises: [] }
    d.excuses.push(excuse('2026-08-11', true))
    const misses = findUnexplainedMisses(d, '2026-08-17')
    expect(misses.map((m) => m.date)).toEqual(['2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15'])

    // a week-scope excuse wipes the whole week
    d.excuses.push({ ...excuse('2026-08-10', true, 'travel'), scope: 'week' })
    expect(findUnexplainedMisses(d, '2026-08-17')).toEqual([])
  })

  it('never interrogates days from before the app was installed', () => {
    const d = makeData()
    // phase aligned to a past Monday, but the app installed mid-week Friday
    d.settings.installedAt = '2026-08-14'
    const misses = findUnexplainedMisses(d, '2026-08-17')
    expect(misses.map((m) => m.date)).toEqual(['2026-08-14', '2026-08-15'])
  })
})

describe('debrief composer', () => {
  it('composes recap with live protein numbers and tomorrow awareness', () => {
    const d = makeData()
    const session = {
      date: '2026-08-14', // Friday → tomorrow is CNS Saturday
      templateId: 'friday',
      status: 'completed' as const,
      exercises: [
        { exerciseId: 'pull-up', sets: [{ targetReps: 'max', reps: 8, done: true }] },
        { exerciseId: 'barbell-row', sets: [{ targetReps: '8', weightLb: 135, reps: 8, done: true }] },
      ],
    }
    d.sessions[session.date] = session
    d.meals[session.date] = {
      date: session.date,
      entries: [{ id: '1', at: '', label: 'Lunch', proteinG: 120, kcal: 1400, source: 'mealTemplate', servings: 1 }],
      supplements: { creatine: false, fishOil: false, vitD3: false, electrolytes: false },
    }
    const composed = composeDebrief(d, session, session.date)
    expect(composed.debrief.recap.some((l) => l.includes('2/2 sets'))).toBe(true)
    expect(composed.debrief.eat[0]).toMatch(/80|120/) // live protein numbers present
    expect(composed.debrief.sleep.join(' ')).toMatch(/CNS day/)
    expect(composed.debrief.tomorrow).toMatch(/Max Speed/)
    expect(new Set(composed.shownIds).size).toBe(composed.shownIds.length)
  })
})
