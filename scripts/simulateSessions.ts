// ============================================================
// The same twenty people, but watching the screen instead of
// the engines.
//
// simulate.ts asks whether the maths is right. This asks the
// question underneath it: sitting in the gym on a Tuesday, does
// this thing sound like it knows who you are? So it captures
// what the athlete is actually TOLD, session by session, and
// nothing about how it was computed: the banners on the day, the
// debrief after it, the coach feed, the PRs, the numbers written
// down.
//
// It also puts the adaptation paths under load, which the first
// harness never did: readiness flags, deliberately lighter days,
// and days that simply do not happen. Those are the branches an
// athlete meets in a bad week, and a bad week is where an app
// either understands you or stops being used.
//
//   npx vite-node scripts/simulateSessions.ts [outfile.json]
// ============================================================
import { writeFileSync } from 'node:fs'
import { PERSONAS } from './simPersonas.mjs'
import { generatePlan, type OnboardingAnswers } from '../src/plan/generator'
import { emptyAppData, defaultWeekState, type AppData, type ISODate } from '../src/types'
import { useAppStore } from '../src/store/appStore'
import { resolveDay } from '../src/engine/resolveDay'
import { addDaysISO, mondayOf } from '../src/engine/calendar'
import { startSession } from '../src/logic/sessionStart'
import { dailyCoachSweep, finishSession, patchSet } from '../src/logic/actions'
import { recordRir, recordShortfall } from '../src/logic/fatigueActions'
import { buildJourney } from '../src/engine/journey'
import { getExercise } from '../src/plan/exercises'

const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
}

const START = '2026-01-05'
const WEEKS = 8
const store = () => useAppStore.getState()

function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const askedFor = (t: string) => Number((t.match(/^\d+/) ?? [])[0])

interface SessionRecord {
  week: number
  date: ISODate
  title: string
  banners: string[]
  readiness: string | null
  intensity: string
  setsDone: number
  setsPlanned: number
  tonnage: number
  shortfalls: number
  loadChanges: string[]
  prs: string[]
  recap: string[]
  recovery: string[]
  eat: string[]
  sleep: string[]
  tomorrow: string
  coach: string[]
}

function run(p: (typeof PERSONAS)[number]) {
  const rand = rng([...p.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11))
  const gen = generatePlan(p.answers as unknown as OnboardingAnswers)
  const plan = gen.plan
  const bw = (p.answers as { bodyweightLb: number }).bodyweightLb

  const data: AppData = emptyAppData(START, START, plan)
  data.settings.onboarded = true
  data.settings.proteinTargetG = gen.proteinTargetG
  data.measurements.push({ date: START, weightLb: bw } as AppData['measurements'][number])
  for (let w = 0; w <= WEEKS + 1; w++) {
    const m = mondayOf(addDaysISO(START, w * 7))
    data.weeks[m] = defaultWeekState(m)
  }
  if (p.prefs) Object.assign(data.prefs, p.prefs)
  store().replaceData(data)

  const journeyStart = buildJourney(store().data, START)
  const sessions: SessionRecord[] = []
  const missed: { week: number; date: ISODate; title: string }[] = []
  let feedSeen = 0

  for (let d = 0; d < WEEKS * 7; d++) {
    const date = addDaysISO(START, d)
    const week = Math.floor(d / 7) + 1
    // The app runs this once a day when it is opened. The harness has to
    // as well, or it measures an app nobody launched.
    dailyCoachSweep()
    const r = resolveDay(date, store().data)
    if (r.kind !== 'session' || r.exercises.length === 0) continue

    if (rand() > p.behaviour.adherence) {
      missed.push({ week, date, title: r.title })
      continue
    }

    // A real week has bad days in it. Two flags is what trips a downgrade.
    const rough = rand() < 0.18
    const flags: [boolean, boolean, boolean, boolean] = [
      rough && rand() < 0.8,
      rough && rand() < 0.6,
      rough && rand() < 0.7,
      rough && rand() < 0.6,
    ]
    const flagCount = flags.filter(Boolean).length
    const intensity = !rough && rand() < 0.08 ? 'lighter' : 'full'
    startSession(date, flagCount ? flags : undefined, intensity as 'full' | 'lighter')

    const started = store().data.sessions[date]
    if (!started) continue
    const setsPlanned = started.exercises.reduce((n, x) => n + x.sets.length, 0)
    const loadChanges: string[] = []
    let shortfalls = 0
    let seen = 0

    for (let ei = 0; ei < started.exercises.length; ei++) {
      const live = store().data.sessions[date]!.exercises[ei]
      const half = Math.ceil(live.sets.length / 2)
      for (let si = 0; si < live.sets.length; si++) {
        seen++
        const cur = store().data.sessions[date]!.exercises[ei]
        const target = askedFor(cur.sets[si]?.targetReps ?? '')
        patchSet(date, ei, si, { done: true })
        const pShort = p.behaviour.shortfall + p.behaviour.fade * (seen / setsPlanned)
        if (Number.isFinite(target) && target > 2 && rand() < pShort) {
          const got = Math.max(1, target - 1 - Math.floor(rand() * 3))
          const said = recordShortfall(date, ei, si, got)
          shortfalls++
          if (said) loadChanges.push(`${getExercise(cur.exerciseId).name}: ${said}`)
        }
        if (si + 1 === half) recordRir(date, ei, si, rand() < p.behaviour.hard ? 0 : p.behaviour.rir)
      }
    }

    const debrief = finishSession(date)
    const done = store().data.sessions[date]!
    const setsDone = done.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0)
    const tonnage = done.exercises.reduce(
      (n, x) => n + x.sets.reduce((m, s) => m + (s.done ? (s.weightLb ?? 0) * (s.achieved ?? s.reps ?? 0) : 0), 0),
      0,
    )
    const feed = store().data.coach.feed
    const fresh = feed.slice(0, Math.max(0, feed.length - feedSeen)).map((f) => f.text)
    feedSeen = feed.length

    sessions.push({
      week,
      date,
      title: r.title,
      banners: r.banners.map((b) => b.text),
      readiness: flagCount ? `${flagCount} flags` : null,
      intensity,
      setsDone,
      setsPlanned,
      tonnage: Math.round(tonnage),
      shortfalls,
      loadChanges,
      prs: debrief.recap.filter((x) => /PR:/.test(x)),
      recap: debrief.recap,
      recovery: debrief.recovery,
      eat: debrief.eat,
      sleep: debrief.sleep,
      tomorrow: debrief.tomorrow,
      coach: fresh,
    })
  }

  const journeyEnd = buildJourney(store().data, addDaysISO(START, WEEKS * 7))
  const final = store().data

  return {
    id: p.id,
    who: p.who,
    life: p.life,
    goal: plan.goal,
    goalStatement: plan.goalStatement,
    days: plan.daysPerWeek,
    equipment: plan.equipment,
    prefs: p.prefs ?? null,
    strategy: gen.strategy,
    rationaleSample: Object.entries(plan.rationale).slice(0, 3).map(([id, why]) => ({
      name: getExercise(id).name,
      why,
    })),
    nutrition: { training: plan.nutrition.kcalTraining, rest: plan.nutrition.kcalRest, protein: gen.proteinTargetG },
    sessions,
    missed,
    journey: {
      startDone: journeyStart.doneCount,
      endDone: journeyEnd.doneCount,
      total: journeyEnd.totalCount,
      next: journeyEnd.next?.label ?? null,
      nextEta: journeyEnd.next?.etaLabel ?? journeyEnd.next?.note ?? null,
      summit: journeyEnd.summit?.label ?? null,
    },
    recorded: {
      sessions: Object.keys(final.sessions).length,
      setsLogged: Object.values(final.sessions).reduce(
        (n, s) => n + s.exercises.reduce((m, x) => m + x.sets.filter((y) => y.done).length, 0),
        0,
      ),
      achievedCaptured: Object.values(final.sessions).reduce(
        (n, s) => n + s.exercises.reduce((m, x) => m + x.sets.filter((y) => y.achieved !== undefined).length, 0),
        0,
      ),
      rirCaptured: Object.values(final.sessions).reduce(
        (n, s) => n + s.exercises.filter((x) => x.rir !== undefined).length,
        0,
      ),
      lightMarked: Object.values(final.sessions).reduce(
        (n, s) => n + s.exercises.reduce((m, x) => m + x.sets.filter((y) => y.light).length, 0),
        0,
      ),
      coachItems: final.coach.feed.length,
    },
  }
}

const out = PERSONAS.map((p) => {
  const t0 = Date.now()
  const r = run(p)
  process.stdout.write(
    `${p.id.padEnd(18)} ${String(r.sessions.length).padStart(2)} sessions, ${r.missed.length} missed, ` +
      `${r.recorded.coachItems} coach items  ${Date.now() - t0}ms\n`,
  )
  return r
})

const file = process.argv[2] ?? '/tmp/sessions.json'
writeFileSync(file, JSON.stringify({ start: START, weeks: WEEKS, personas: out }, null, 2))
console.log(`\nwrote ${out.length} personas to ${file}`)
