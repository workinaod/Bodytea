import { describe, expect, it } from 'vitest'
import { generatePlan, type OnboardingAnswers } from '../plan/generator'
import { emptyAppData, defaultWeekState, type AppData } from '../types'
import { useAppStore } from '../store/appStore'
import { resolveDay } from './resolveDay'
import { addDaysISO, mondayOf } from './calendar'
import { startSession } from '../logic/sessionStart'
import { finishSession, patchSet } from '../logic/actions'
import { recordShortfall } from '../logic/fatigueActions'

// ============================================================
// GOLDEN LIFE: one person, eight weeks, the whole pipeline.
//
// The unit tests each hold one engine still and poke it. The sims
// drive everything at once but their output is a report somebody
// has to go read. This is the piece between them: a deterministic
// athlete driven through the real code path, resolveDay to
// startSession to patchSet to recordShortfall to finishSession,
// with the per-week story pinned as a snapshot.
//
// If this snapshot changes, the lived experience of an athlete
// changed: a prescription, a load response, a rep target. That is
// sometimes the point of a change, in which case update it and
// say why in the commit. What it must never be is a surprise.
//
// The persona trains with minimal equipment on purpose, so the
// bodyweight paths (rep prescriptions, no-load responses) are
// part of the story being pinned, not an untested corner.
// ============================================================

const START = '2026-01-05' // a Monday
const WEEKS = 8

const ANSWERS = {
  goal: 'strength',
  goalStatement: 'get strong with what I have',
  customTargets: [],
  daysPerWeek: 3,
  equipProfile: 'minimal',
  extraEquip: [],
  experience: 'returning',
  bodyweightLb: 170,
  sex: 'male',
  mealsPerDay: 3,
} as unknown as OnboardingAnswers

describe('golden life', () => {
  it('replays eight deterministic weeks exactly', () => {
    const gen = generatePlan(ANSWERS)
    const data: AppData = emptyAppData(START, START, gen.plan)
    data.settings.onboarded = true
    data.settings.proteinTargetG = gen.proteinTargetG
    data.measurements.push({ date: START, weightLb: 170 } as AppData['measurements'][number])
    for (let w = 0; w <= WEEKS + 1; w++) {
      const m = mondayOf(addDaysISO(START, w * 7))
      data.weeks[m] = defaultWeekState(m)
    }
    useAppStore.setState({ data })
    const store = () => useAppStore.getState()

    const lines: string[] = []
    // Deterministic grind: every seventh completed set comes up two
    // short. No randomness, so the story is the same on every machine.
    let setCounter = 0

    for (let d = 0; d < WEEKS * 7; d++) {
      const date = addDaysISO(START, d)
      const week = Math.floor(d / 7) + 1
      const r = resolveDay(date, store().data)
      if (r.kind !== 'session' || r.exercises.length === 0) continue

      startSession(date)
      const started = store().data.sessions[date]
      if (!started) continue

      const said: string[] = []
      for (let ei = 0; ei < started.exercises.length; ei++) {
        const live = store().data.sessions[date]!.exercises[ei]
        for (let si = 0; si < live.sets.length; si++) {
          setCounter++
          const cur = store().data.sessions[date]!.exercises[ei]
          const target = Number((cur.sets[si]?.targetReps.match(/^\d+/) ?? [])[0])
          patchSet(date, ei, si, { done: true })
          if (setCounter % 7 === 0 && Number.isFinite(target) && target > 2) {
            const response = recordShortfall(date, ei, si, Math.max(1, target - 2))
            if (response) said.push(response)
          }
        }
      }
      finishSession(date)

      const done = store().data.sessions[date]!
      const sets = done.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0)
      const tonnage = done.exercises.reduce(
        (n, x) =>
          n + x.sets.reduce((m, s) => m + (s.done ? (s.weightLb ?? 0) * (s.achieved ?? s.reps ?? 0) : 0), 0),
        0,
      )
      const asks = done.exercises
        .map((x) => {
          const first = x.sets[0]
          const load = first?.weightLb !== undefined ? `@${first.weightLb}` : ''
          return `${x.exerciseId} ${x.sets.length}x${first?.targetReps ?? '?'}${load}`
        })
        .join(' | ')
      lines.push(`w${week} ${date} ${done.templateId}: ${sets} sets, ${Math.round(tonnage)} lb`)
      lines.push(`  ${asks}`)
      for (const s of said) lines.push(`  ! ${s}`)
    }

    expect(lines.length, 'the summary stays compact').toBeLessThanOrEqual(200)
    expect(lines.join('\n')).toMatchSnapshot()
  })
})
