import { describe, expect, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type SessionLog } from '../types'
import { addDaysISO, daysBetween, mondayOf, weekdayOf, weekIndexFor } from './calendar'
import { blockMathFor, cardioRequiredForWeek, nutritionDayType, resolveDay } from './resolveDay'
import { isIntenseSport } from '../plan/cardio'
import { currentStreak, detectPRs, e1RM, kcalBumpSuggestion, proteinFor } from './stats'
import { applyDeload, applyReadinessDowngrade, buildFromTemplate, minimumViableFor } from './transforms'
import { getTemplate } from '../plan/templates'
import { buildNaodPreset } from '../plan/presets/naod'

const PLAN = buildNaodPreset()

// Phase start: Monday 2026-08-10 (all fixture dates are relative to it)
const START = '2026-08-10'

function makeData(overrides?: Partial<AppData>): AppData {
  const data = emptyAppData(START)
  data.settings.onboarded = true
  return { ...data, ...(overrides ?? {}) }
}

function ids(exs: { exerciseId: string }[]): string[] {
  return exs.map((e) => e.exerciseId)
}

describe('calendar', () => {
  it('mondayOf handles all weekdays including Sunday', () => {
    expect(mondayOf('2026-08-10')).toBe('2026-08-10') // Monday
    expect(mondayOf('2026-08-12')).toBe('2026-08-10') // Wednesday
    expect(mondayOf('2026-08-16')).toBe('2026-08-10') // Sunday belongs to the Mon-start week
    expect(mondayOf('2026-08-17')).toBe('2026-08-17') // next Monday
  })

  it('weekIndexFor counts Monday-start weeks', () => {
    expect(weekIndexFor('2026-08-10', START)).toBe(1)
    expect(weekIndexFor('2026-08-16', START)).toBe(1) // Sunday of week 1
    expect(weekIndexFor('2026-08-17', START)).toBe(2)
    expect(weekIndexFor('2026-11-29', START)).toBe(16) // last day of week 16
    expect(weekIndexFor('2026-11-30', START)).toBe(17)
  })

  it('is DST-immune (US spring-forward Mar 8 2026 and fall-back Nov 1 2026)', () => {
    expect(weekIndexFor('2026-03-09', '2026-03-02')).toBe(2)
    expect(weekIndexFor('2026-11-02', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
    expect(addDaysISO('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDaysISO('2026-11-01', 1)).toBe('2026-11-02')
  })

  it('clamps pre-phase dates to week 1', () => {
    expect(weekIndexFor('2026-08-03', START)).toBe(1)
  })
})

describe('block math', () => {
  it('maps 16 weeks to blocks 1,2,3,1 with deloads at 4/8/12/16', () => {
    const expectBlock = (week: number, block: number, deload: boolean) => {
      const date = addDaysISO(START, (week - 1) * 7)
      const m = blockMathFor(date, START)
      expect(m.weekIndex).toBe(week)
      expect(m.blockIndex).toBe(block)
      expect(m.isDeload).toBe(deload)
    }
    for (const [w, b] of [[1, 1], [2, 1], [3, 1], [4, 1], [5, 2], [8, 2], [9, 3], [12, 3], [13, 1], [16, 1]] as const) {
      expectBlock(w, b, w % 4 === 0)
    }
    // loops past week 16
    expectBlock(17, 2, false)
    expectBlock(21, 3, false)
    expectBlock(25, 1, false)
  })

  it('alternates A/B weeks by parity', () => {
    expect(blockMathFor(START, START).abWeek).toBe('A')
    expect(blockMathFor(addDaysISO(START, 7), START).abWeek).toBe('B')
  })
})

describe('slot resolution + A/B + dedupe', () => {
  it('block 1 Monday matches the V4 day table', () => {
    const exs = buildFromTemplate(getTemplate('monday'), 1, 'A', PLAN)
    expect(ids(exs)).toEqual([
      'dynamic-warmup',
      'snap-down-stick',
      'falling-start-sprint',
      'countermovement-jump',
      'broad-jump-stick',
      'goblet-squat',
      'romanian-deadlift',
      'bulgarian-split-squat',
      'single-leg-calf-raise',
      'hanging-leg-raise',
    ])
  })

  it('block 1 Wednesday has the weighted sit-up (core offset)', () => {
    const exs = buildFromTemplate(getTemplate('wednesday'), 1, 'A', PLAN)
    expect(ids(exs)).toContain('weighted-situp')
    expect(ids(exs)).toContain('single-leg-rdl')
  })

  it('block 2 rotates the slots', () => {
    const mon = buildFromTemplate(getTemplate('monday'), 2, 'A', PLAN)
    expect(ids(mon)).toContain('db-front-squat')
    expect(ids(mon)).toContain('walking-lunge')
    expect(ids(mon)).toContain('weighted-situp')
    const wed = buildFromTemplate(getTemplate('wednesday'), 2, 'A', PLAN)
    expect(ids(wed)).toContain('good-morning')
    expect(ids(wed)).toContain('plank-side-plank')
  })

  it('Friday A/B alternates pullover and one-arm row', () => {
    const a = buildFromTemplate(getTemplate('friday'), 1, 'A', PLAN)
    const b = buildFromTemplate(getTemplate('friday'), 1, 'B', PLAN)
    expect(ids(a)).toContain('db-pullover')
    expect(ids(a)).not.toContain('one-arm-db-row')
    expect(ids(b)).toContain('one-arm-db-row')
    expect(ids(b)).not.toContain('db-pullover')
  })

  it('block 2 week B: A/B pick collides with row slot → substitutes pullover', () => {
    const exs = buildFromTemplate(getTemplate('friday'), 2, 'B', PLAN)
    const list = ids(exs)
    // slot claims one-arm-db-row; the ab entry falls back to pullover
    expect(list.filter((x) => x === 'one-arm-db-row').length).toBe(1)
    expect(list).toContain('db-pullover')
  })

  it('block 3 Friday: curl slot claims hammer → fixed hammer becomes EZ curl', () => {
    const exs = buildFromTemplate(getTemplate('friday'), 3, 'A', PLAN)
    const list = ids(exs)
    expect(list.filter((x) => x === 'hammer-curl').length).toBe(1)
    expect(list).toContain('ez-bar-curl')
  })

  it('never emits duplicate exercises in one day', () => {
    for (const block of [1, 2, 3] as const) {
      for (const ab of ['A', 'B'] as const) {
        for (const tid of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
          const list = ids(buildFromTemplate(getTemplate(tid), block, ab, PLAN))
          expect(new Set(list).size, `${tid} b${block} ${ab}`).toBe(list.length)
        }
      }
    }
  })

  it('plank slot gets its timed rep scheme via override', () => {
    const wed = buildFromTemplate(getTemplate('wednesday'), 2, 'A', PLAN)
    const plank = wed.find((e) => e.exerciseId === 'plank-side-plank')!
    expect(plank.repText).toBe('30-45 sec each')
  })
})

describe('deload transform', () => {
  it('halves lift sets, halves rep-only explosive reps, leaves mobility alone', () => {
    const mon = applyDeload(buildFromTemplate(getTemplate('monday'), 1, 'A', PLAN))
    const byId = Object.fromEntries(mon.map((e) => [e.exerciseId, e]))
    expect(byId['countermovement-jump'].sets).toBe(2) // 3 → 2
    expect(byId['snap-down-stick'].sets).toBe(1) // 2 → 1
    expect(byId['falling-start-sprint'].repsNum).toBe(3) // 5 → 3
    expect(byId['goblet-squat'].sets).toBe(2) // 4 → 2
    expect(byId['romanian-deadlift'].sets).toBe(2) // 3 → 2

    const thu = applyDeload(buildFromTemplate(getTemplate('thursday'), 1, 'A', PLAN))
    const hold = thu.find((e) => e.exerciseId === 'deep-squat-hold')!
    expect(hold.sets).toBe(3) // untouched
  })
})

describe('readiness downgrade', () => {
  it('cuts explosive volume by a third and lights the lifts', () => {
    const mon = applyReadinessDowngrade(buildFromTemplate(getTemplate('monday'), 1, 'A', PLAN))
    const byId = Object.fromEntries(mon.map((e) => [e.exerciseId, e]))
    expect(byId['countermovement-jump'].sets).toBe(2) // round(3 * 2/3)
    expect(byId['falling-start-sprint'].repsNum).toBe(3) // round(5 * 2/3)
    expect(byId['goblet-squat'].lightMode).toBe(true)
  })

  it('stacks with deload (both rules respected, floor of 1)', () => {
    const deloaded = applyDeload(buildFromTemplate(getTemplate('monday'), 1, 'A', PLAN))
    const both = applyReadinessDowngrade(deloaded)
    const byId = Object.fromEntries(both.map((e) => [e.exerciseId, e]))
    expect(byId['countermovement-jump'].sets).toBe(1) // 3 → 2 → round(2*2/3)=1
    expect(byId['falling-start-sprint'].repsNum).toBe(2) // 5 → 3 → 2
  })
})

describe('resolveDay integration', () => {
  it('tier 1 week: correct kinds per weekday', () => {
    const data = makeData()
    expect(resolveDay('2026-08-10', data).kind).toBe('session') // Mon
    expect(resolveDay('2026-08-10', data).cns).toBe(true)
    expect(resolveDay('2026-08-11', data).kind).toBe('session') // Tue
    expect(resolveDay('2026-08-13', data).kind).toBe('mobility') // Thu
    expect(resolveDay('2026-08-15', data).cns).toBe(true) // Sat
    expect(resolveDay('2026-08-16', data).kind).toBe('rest') // Sun
  })

  it('deload banner + halved volume on week 4', () => {
    const data = makeData()
    const day = resolveDay(addDaysISO(START, 21), data) // Monday week 4
    expect(day.isDeload).toBe(true)
    expect(day.banners.some((b) => b.id === 'deload')).toBe(true)
    expect(day.exercises.find((e) => e.exerciseId === 'countermovement-jump')!.sets).toBe(2)
  })

  it('tier 2: default placement Mon=lower, Wed=upper, Sat=explosive; Tue=rest', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = { ...defaultWeekState(monday), tier: 2 }
    expect(resolveDay('2026-08-10', data).templateId).toBe('t2-lower')
    expect(resolveDay('2026-08-11', data).kind).toBe('rest')
    expect(resolveDay('2026-08-12', data).templateId).toBe('t2-upper')
    expect(resolveDay('2026-08-15', data).templateId).toBe('saturday')
  })

  it('tier 3 with custom placement', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = {
      ...defaultWeekState(monday),
      tier: 3,
      tierPlacement: { fullbody: 2, explosive: 5 },
    }
    expect(resolveDay('2026-08-11', data).templateId).toBe('t3-fullbody') // Tue
    expect(resolveDay('2026-08-14', data).templateId).toBe('t3-explosive') // Fri
    expect(resolveDay('2026-08-15', data).kind).toBe('rest') // Sat now rest
  })

  it('tier 2 on a deload week still deloads', () => {
    const data = makeData()
    const monday = addDaysISO(START, 21) // week 4
    data.weeks[monday] = { ...defaultWeekState(monday), tier: 2 }
    const day = resolveDay(monday, data)
    expect(day.templateId).toBe('t2-lower')
    expect(day.exercises.find((e) => e.exerciseId === 'front-squat')!.sets).toBe(2) // 4 → 2
  })

  it('DJ Friday push: Friday becomes rest, Saturday gets combined pull', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = {
      ...defaultWeekState(monday),
      events: { dj: [5] },
      friPushedToSat: true,
    }
    const fri = resolveDay('2026-08-14', data)
    expect(fri.kind).toBe('rest')
    expect(fri.banners.some((b) => b.id === 'fri-pushed')).toBe(true)
    const sat = resolveDay('2026-08-15', data)
    expect(ids(sat.exercises)).toContain('pull-up')
    expect(ids(sat.exercises)).toContain('max-velocity-sprint')
  })

  it('on-feet event on Sunday drops a jump set from Monday', () => {
    const data = makeData()
    const prevMonday = mondayOf(addDaysISO(START, -7))
    data.weeks[prevMonday] = { ...defaultWeekState(prevMonday), events: { shift: [0] } }
    const day = resolveDay('2026-08-10', data)
    expect(day.exercises.find((e) => e.exerciseId === 'countermovement-jump')!.sets).toBe(2) // 3 − 1, pre-fatigued
  })

  it('late-night event: warn banner on the day, aftermath note the morning after', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = { ...defaultWeekState(monday), events: { dj: [5] } }
    const fri = resolveDay('2026-08-14', data)
    expect(fri.banners.some((b) => b.id === 'late-night-dj' && b.tone === 'warn')).toBe(true)
    const sat = resolveDay('2026-08-15', data)
    expect(sat.banners.some((b) => b.id === 'late-night-after')).toBe(true)
  })

  it('a CUSTOM on-feet event pre-fatigues the following day, wherever it lands', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.plan.lifeEvents = [...data.plan.lifeEvents, { id: 'close', label: 'Closing shift', kind: 'on-feet' }]
    data.weeks[monday] = { ...defaultWeekState(monday), events: { close: [1] } }
    const tue = resolveDay('2026-08-11', data)
    expect(tue.banners.some((b) => b.id === 'pre-fatigued' && b.text.includes('Closing shift'))).toBe(true)
  })

  it('logged conditioning cardio satisfies the weekly rule; shooting around does not', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = { ...defaultWeekState(monday), ballThisWeek: false }
    expect(cardioRequiredForWeek(data, '2026-08-13')).toBe(true)
    data.cardio['2026-08-11'] = [{ id: 'x', at: 'x', activityId: 'run', label: 'Run', when: 'solo', miles: 2 }]
    expect(cardioRequiredForWeek(data, '2026-08-13')).toBe(false)
    data.cardio['2026-08-11'] = [
      { id: 'x', at: 'x', activityId: 'basketball', label: 'Basketball', when: 'solo', mode: 'shooting' },
    ]
    expect(cardioRequiredForWeek(data, '2026-08-13')).toBe(true)
  })

  it('intense sport modes mark a played day; casual modes and steady cardio do not', () => {
    expect(isIntenseSport('basketball', 'games')).toBe(true)
    expect(isIntenseSport('basketball', 'shooting')).toBe(false)
    expect(isIntenseSport('soccer', 'match')).toBe(true)
    expect(isIntenseSport('tennis', 'rally')).toBe(false)
    expect(isIntenseSport('run')).toBe(false)
    expect(isIntenseSport('swim')).toBe(false)
  })

  it('two consecutive bad-sleep nights cut volume by a third', () => {
    const data = makeData()
    const monday = mondayOf('2026-08-12')
    data.weeks[monday] = {
      ...defaultWeekState(monday),
      badSleepDates: ['2026-08-10', '2026-08-11'],
    }
    const day = resolveDay('2026-08-12', data) // Wednesday
    expect(day.banners.some((b) => b.id === 'bad-sleep')).toBe(true)
    expect(day.exercises.find((e) => e.exerciseId === 'front-squat')!.sets).toBe(3) // 4 → 3
  })

  it('readiness downgrade applies when the logged session says so', () => {
    const data = makeData()
    data.sessions['2026-08-10'] = {
      date: '2026-08-10',
      templateId: 'monday',
      status: 'partial',
      readiness: { flags: [true, true, false, false], downgraded: true },
      exercises: [],
    }
    const day = resolveDay('2026-08-10', data)
    expect(day.exercises.find((e) => e.exerciseId === 'countermovement-jump')!.sets).toBe(2)
    expect(day.banners.some((b) => b.id === 'readiness')).toBe(true)
  })

  it('scheduled cardio backup replaces the day', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = {
      ...defaultWeekState(monday),
      ballThisWeek: false,
      cardio: { exerciseId: 'hill-sprint', weekdays: [4] },
    }
    const thu = resolveDay('2026-08-13', data)
    expect(thu.kind).toBe('cardio-backup')
    expect(ids(thu.exercises)).toEqual(['hill-sprint'])
  })

  it('tier-1 no-ball week nags on the rest day; tier 2 stays quiet (skip formal cardio)', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = { ...defaultWeekState(monday), ballThisWeek: false }
    const sun = resolveDay('2026-08-16', data)
    expect(sun.banners.some((b) => b.id === 'cardio-nag')).toBe(true)

    data.weeks[monday] = { ...defaultWeekState(monday), tier: 2, ballThisWeek: false }
    const thu = resolveDay('2026-08-13', data)
    expect(thu.banners.some((b) => b.id === 'cardio-nag')).toBe(false)
  })

  it('phase completes after week 16 but training loops on', () => {
    const data = makeData()
    const week17monday = addDaysISO(START, 16 * 7)
    const day = resolveDay(week17monday, data)
    expect(day.phaseComplete).toBe(true)
    expect(day.kind).toBe('session')
    expect(day.blockIndex).toBe(2)
  })

  it('minimum viable session comes from the template recipe', () => {
    const data = makeData()
    const day = resolveDay('2026-08-15', data)
    const mv = minimumViableFor(getTemplate(day.templateId!), day.exercises)
    expect(mv.exercises.length).toBeGreaterThanOrEqual(2)
    expect(ids(mv.exercises)).toContain('max-velocity-sprint')
  })
})

describe('same-day ball + mandatory cardio', () => {
  it('declared no-ball week: Thursday flips to the required cardio chooser', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = { ...defaultWeekState(monday), ballThisWeek: false }
    const thu = resolveDay('2026-08-13', data)
    expect(thu.kind).toBe('cardio-backup')
    expect(thu.exercises.length).toBe(0)
    expect(thu.banners.some((b) => b.id === 'cardio-required')).toBe(true)
  })

  it('logging a ball day clears the requirement and dissolves scheduled backups', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = {
      ...defaultWeekState(monday),
      ballThisWeek: false,
      ballDates: ['2026-08-11'],
      cardio: { exerciseId: 'hill-sprint', weekdays: [4] },
    }
    const thu = resolveDay('2026-08-13', data)
    expect(thu.kind).toBe('mobility') // back to normal Thursday
    const tue = resolveDay('2026-08-11', data)
    expect(tue.banners.some((b) => b.id === 'ball-today')).toBe(true)
  })

  it('no forecast + late week: nag banner, no forced takeover', () => {
    const data = makeData()
    const thu = resolveDay('2026-08-13', data) // ballThisWeek null
    expect(thu.kind).toBe('mobility')
    const sun = resolveDay('2026-08-16', data)
    expect(sun.banners.some((b) => b.id === 'cardio-nag')).toBe(true)
  })

  it('ball yesterday offers a CNS swap; swapping strips sprints and jumps only', () => {
    const data = makeData()
    const monday = mondayOf(START)
    // ball Sunday (previous week) before Monday CNS
    const prevMonday = mondayOf('2026-08-09')
    data.weeks[prevMonday] = { ...defaultWeekState(prevMonday), ballDates: ['2026-08-09'] }
    let mon = resolveDay('2026-08-10', data)
    expect(mon.banners.some((b) => b.id === 'ball-before-cns')).toBe(true)

    data.weeks[monday] = { ...defaultWeekState(monday), cnsSwapDates: ['2026-08-10'] }
    mon = resolveDay('2026-08-10', data)
    expect(mon.banners.some((b) => b.id === 'cns-swapped')).toBe(true)
    expect(mon.exercises.some((e) => e.kind === 'sprint' || e.kind === 'jump')).toBe(false)
    expect(mon.exercises.some((e) => e.exerciseId === 'romanian-deadlift')).toBe(true)
  })

  it('ball on the eve of a CNS day warns ahead', () => {
    const data = makeData()
    const monday = mondayOf('2026-08-09')
    data.weeks[monday] = { ...defaultWeekState(monday), ballDates: ['2026-08-09'] }
    const sun = resolveDay('2026-08-09', data)
    expect(sun.banners.some((b) => b.id === 'ball-eve-of-cns')).toBe(true)
  })

  it('tier 2/3 weeks never require formal cardio (PDF: skip it)', () => {
    const data = makeData()
    const monday = mondayOf(START)
    data.weeks[monday] = { ...defaultWeekState(monday), tier: 2, ballThisWeek: false }
    const thu = resolveDay('2026-08-13', data)
    expect(thu.kind).toBe('rest')
    expect(thu.banners.some((b) => b.id === 'cardio-required')).toBe(false)
  })
})

describe('nutrition day type', () => {
  it('training on session days, rest on Sunday/Thursday, skip → rest, override wins', () => {
    const data = makeData()
    expect(nutritionDayType('2026-08-10', data)).toBe('training')
    expect(nutritionDayType('2026-08-13', data)).toBe('rest') // mobility Thursday
    expect(nutritionDayType('2026-08-16', data)).toBe('rest')

    data.sessions['2026-08-10'] = {
      date: '2026-08-10',
      templateId: 'monday',
      status: 'skipped',
      exercises: [],
    }
    expect(nutritionDayType('2026-08-10', data)).toBe('rest')

    data.meals['2026-08-10'] = {
      date: '2026-08-10',
      entries: [],
      supplements: { creatine: false, fishOil: false, vitD3: false, electrolytes: false },
      dayTypeOverride: 'training',
    }
    expect(nutritionDayType('2026-08-10', data)).toBe('training')
  })
})

describe('stats', () => {
  function loggedSession(date: string, templateId: string, weight = 100, reps = 8): SessionLog {
    return {
      date,
      templateId,
      status: 'completed',
      exercises: [
        {
          exerciseId: 'front-squat',
          sets: [{ targetReps: '6-8', weightLb: weight, reps, done: true }],
        },
      ],
    }
  }

  it('e1RM uses Epley', () => {
    expect(e1RM(100, 8)).toBe(127)
    expect(e1RM(200, 1)).toBe(207)
  })

  it('detects e1RM PRs against history only', () => {
    const data = makeData()
    data.sessions['2026-08-12'] = loggedSession('2026-08-12', 'wednesday', 100, 8)
    data.sessions['2026-08-19'] = loggedSession('2026-08-19', 'wednesday', 105, 8)
    const prs = detectPRs(data, data.sessions['2026-08-19'])
    expect(prs.length).toBe(1)
    expect(prs[0].exerciseId).toBe('front-squat')
    // first-ever session is not announced as a PR
    expect(detectPRs(data, data.sessions['2026-08-12']).length).toBe(0)
  })

  it('computes the current streak over scheduled days', () => {
    const data = makeData()
    // week 1: log Mon..Sat (Thu is mobility — counts as scheduled)
    for (const [d, t] of [
      ['2026-08-10', 'monday'],
      ['2026-08-11', 'tuesday'],
      ['2026-08-12', 'wednesday'],
      ['2026-08-13', 'thursday'],
      ['2026-08-14', 'friday'],
      ['2026-08-15', 'saturday'],
    ] as const) {
      data.sessions[d] = loggedSession(d, t)
    }
    // "today" = Sunday of week 1: streak counts all six
    expect(currentStreak(data, '2026-08-16')).toBe(6)
    // "today" = Monday week 2 (not yet logged): today passes through
    expect(currentStreak(data, '2026-08-17')).toBe(6)
    // a skipped Wednesday breaks it
    data.sessions['2026-08-12'] = { ...data.sessions['2026-08-12'], status: 'skipped' }
    expect(currentStreak(data, '2026-08-16')).toBe(3)
  })

  it('kcal bump rule fires only with flat weight + climbing strength', () => {
    const data = makeData()
    // measurements 4 weeks apart, weight flat
    data.measurements = [
      { date: '2026-08-16', weightLb: 197, photoIds: {} },
      { date: '2026-08-30', weightLb: 197.4, photoIds: {} },
      { date: '2026-09-13', weightLb: 197.2, photoIds: {} },
    ]
    // strength climbing
    data.sessions['2026-08-12'] = loggedSession('2026-08-12', 'wednesday', 100, 8)
    data.sessions['2026-09-09'] = loggedSession('2026-09-09', 'wednesday', 110, 8)
    const suggestion = kcalBumpSuggestion(data)
    expect(suggestion).not.toBeNull()
    expect(suggestion!.strengthGainPct).toBeGreaterThanOrEqual(3)

    // once the bonus is applied, no more nagging
    data.settings.trainingDayKcalBonus = 150
    expect(kcalBumpSuggestion(data)).toBeNull()
  })

  it('sums protein with servings', () => {
    const data = makeData()
    data.meals['2026-08-10'] = {
      date: '2026-08-10',
      entries: [
        { id: '1', at: '', label: 'Chicken', proteinG: 55, kcal: 375, source: 'chip', servings: 1 },
        { id: '2', at: '', label: 'Shake', proteinG: 25, kcal: 120, source: 'chip', servings: 2 },
      ],
      supplements: { creatine: false, fishOil: false, vitD3: false, electrolytes: false },
    }
    expect(proteinFor(data, '2026-08-10')).toBe(105)
  })
})

describe('weekday sanity', () => {
  it('fixture dates land on the intended weekdays', () => {
    expect(weekdayOf('2026-08-10')).toBe(1) // Monday
    expect(weekdayOf('2026-08-13')).toBe(4) // Thursday
    expect(weekdayOf('2026-08-15')).toBe(6) // Saturday
    expect(weekdayOf('2026-08-16')).toBe(0) // Sunday
  })
})

describe('per-date exercise swaps (🔄)', () => {
  it('replaces the exercise but keeps the prescription, and remembers the original', () => {
    const data = makeData({ swaps: { [START]: { 'countermovement-jump': 'squat-jump' } } })
    const day = resolveDay(START, data)
    expect(ids(day.exercises)).not.toContain('countermovement-jump')
    const row = day.exercises.find((e) => e.exerciseId === 'squat-jump')!
    expect(row.sets).toBe(3)
    expect(row.repText).toBe('3')
    expect(row.swappedFrom).toBe('countermovement-jump')
  })

  it('ignores swaps pointing at unknown exercises', () => {
    const data = makeData({ swaps: { [START]: { 'countermovement-jump': 'not-real' } } })
    expect(ids(resolveDay(START, data).exercises)).toContain('countermovement-jump')
  })

  it('applies only on its own date — next week is untouched', () => {
    const data = makeData({ swaps: { [START]: { 'countermovement-jump': 'squat-jump' } } })
    const nextMonday = addDaysISO(START, 7)
    const nextIds = ids(resolveDay(nextMonday, data).exercises)
    expect(nextIds).toContain('countermovement-jump')
    expect(nextIds).not.toContain('squat-jump')
  })

  it('volume transforms operate on the swapped exercise (deload halves it)', () => {
    const deloadMonday = addDaysISO(START, 21) // week 4 Monday
    const data = makeData({ swaps: { [deloadMonday]: { 'countermovement-jump': 'squat-jump' } } })
    const row = resolveDay(deloadMonday, data).exercises.find((e) => e.exerciseId === 'squat-jump')!
    expect(row.sets).toBe(2)
  })
})

describe('same-day load trim (work ran long)', () => {
  it('cuts explosive volume and lightens lifts for that date only', () => {
    const data = makeData({ dayLoad: { [START]: 'trimmed' } })
    const day = resolveDay(START, data)
    expect(day.banners.some((b) => b.id === 'day-trimmed')).toBe(true)
    expect(day.exercises.find((e) => e.exerciseId === 'countermovement-jump')!.sets).toBe(2)
    expect(day.exercises.find((e) => e.exerciseId === 'goblet-squat')!.lightMode).toBe(true)
    // next Monday is back to the full plan
    const next = resolveDay(addDaysISO(START, 7), data)
    expect(next.exercises.find((e) => e.exerciseId === 'countermovement-jump')!.sets).toBe(3)
    expect(next.banners.some((b) => b.id === 'day-trimmed')).toBe(false)
  })

  it('never stacks with a readiness downgrade — one cut, not two', () => {
    const session: SessionLog = {
      date: START,
      templateId: 'monday',
      status: 'partial',
      readiness: { flags: [true, true, false, false], downgraded: true },
      exercises: [],
    }
    const data = makeData({ dayLoad: { [START]: 'trimmed' }, sessions: { [START]: session } })
    const day = resolveDay(START, data)
    expect(day.exercises.find((e) => e.exerciseId === 'countermovement-jump')!.sets).toBe(2)
    expect(day.banners.filter((b) => b.id === 'readiness' || b.id === 'day-trimmed')).toHaveLength(1)
  })
})
