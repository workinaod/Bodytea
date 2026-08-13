// ============================================================
// Twenty people, twenty weeks, and every engine watched.
//
// Not a test and not a dump. A test asserts one thing about one
// moment; dumpPlans.ts prints the plan as WRITTEN. Neither can
// answer the question this exists for: do the engines learn from
// what actually happens, and do they hand their answers to each
// other correctly?
//
// So this drives the real code path end to end. generatePlan for
// the booklet, resolveDay for every calendar day, startSession
// (which is what calls the load engine), patchSet and
// recordShortfall for the work, finishSession to close it. No
// reimplementation: if the app would do it, this does it, and if
// an engine is wrong the simulation is wrong in the same way.
//
// Twenty weeks because the phase boundary is at seventeen. A
// shorter run cannot see the thing most worth seeing.
//
//   npx vite-node scripts/simulate.ts [outfile.json]
// ============================================================
import { writeFileSync } from 'node:fs'
import { PERSONAS } from './simPersonas.mjs'
import { generatePlan, type OnboardingAnswers } from '../src/plan/generator'
import { emptyAppData, defaultWeekState, type AppData } from '../src/types'
import { useAppStore } from '../src/store/appStore'
import { resolveDay } from '../src/engine/resolveDay'
import { addDaysISO, mondayOf } from '../src/engine/calendar'
import { startSession } from '../src/logic/sessionStart'
import { finishSession, patchSet } from '../src/logic/actions'
import { recordRir, recordShortfall } from '../src/logic/fatigueActions'
import { isMisordered, roleRank, band } from '../src/engine/sequence'
import { overloadedRegions, totalSets } from '../src/engine/volume'
import { estimateMinutes } from '../src/engine/focus'
import { phaseFor, PHASE_WEEKS } from '../src/engine/phase'
import { nextSessionSuggestions } from '../src/engine/fatigue'
import { liftSeries } from '../src/engine/stats'
import { MOVEMENT } from '../src/plan/movement'
import { getExercise } from '../src/plan/exercises'

// The store persists to localStorage on a debounce and logs when it
// cannot. In node it cannot, every time, so give it somewhere to write
// and keep the output about the engines.
const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
}

const START = '2026-01-05' // a Monday
const WEEKS = 20
const store = () => useAppStore.getState()

/** Seeded so a report can be regenerated and compared. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const askedFor = (t: string) => Number((t.match(/^\d+/) ?? [])[0])

interface LiftPoint {
  week: number
  target: number
  weightLb?: number
  event?: string
}

function simulate(p: (typeof PERSONAS)[number]) {
  const rand = rng(
    [...p.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7),
  )
  const gen = generatePlan(p.answers as unknown as OnboardingAnswers)
  const plan = gen.plan

  const data: AppData = emptyAppData(START, START, plan)
  data.settings.onboarded = true
  data.settings.proteinTargetG = gen.proteinTargetG
  data.measurements.push({
    date: START,
    weightLb: (p.answers as { bodyweightLb: number }).bodyweightLb,
  } as AppData['measurements'][number])
  for (let w = 0; w <= WEEKS + 1; w++) {
    const m = mondayOf(addDaysISO(START, w * 7))
    data.weeks[m] = defaultWeekState(m)
  }
  if (p.prefs) Object.assign(data.prefs, p.prefs)
  store().replaceData(data)

  // ---- what we watch ----
  const ev = {
    sessionsPlanned: 0,
    sessionsDone: 0,
    misordered: 0,
    overloadedDays: 0,
    ramps: 0,
    trims: 0,
    autoLoadDrops: 0,
    shortfalls: 0,
    rirAnswers: 0,
    startLighter: new Set<string>(),
    swapsAuto: new Map<string, string>(),
    wraps: 0,
    backOffs: 0,
    minutesFirst: 0,
    minutesTypical: [] as number[],
  }
  const track = new Map<string, LiftPoint[]>()
  const notes: string[] = []
  const roleAudit = { primaryFirst: 0, days: 0 }

  for (let d = 0; d < WEEKS * 7; d++) {
    const date = addDaysISO(START, d)
    const week = Math.floor(d / 7) + 1
    const r = resolveDay(date, store().data)
    if (r.kind !== 'session' || r.exercises.length === 0) continue
    ev.sessionsPlanned++

    // ---- ORDERING engine ----
    if (isMisordered(r.exercises)) ev.misordered++
    const lifts = r.exercises.filter((e) => e.kind === 'lift')
    if (lifts.length > 1) {
      roleAudit.days++
      if (roleRank(lifts[0]) <= Math.min(...lifts.map(roleRank))) roleAudit.primaryFirst++
    }
    // ---- VOLUME engine ----
    if (overloadedRegions(r.exercises).length > 0) ev.overloadedDays++
    if (r.banners.some((b) => b.id === 'volume-capped')) ev.trims++
    if (r.banners.some((b) => b.id === 'peak-week')) ev.ramps++
    const mins = estimateMinutes(r.exercises)
    if (ev.minutesFirst === 0) ev.minutesFirst = mins
    ev.minutesTypical.push(mins)
    // ---- ADAPT engine: automatic swaps ----
    for (const e of r.exercises) {
      if (e.swappedFrom) ev.swapsAuto.set(e.swappedFrom, e.exerciseId)
    }
    // ---- BETWEEN-SESSION FATIGUE engine ----
    for (const s of nextSessionSuggestions(store().data, date)) {
      if (s.kind === 'start-lighter') ev.startLighter.add(s.exerciseId)
    }

    // Life gets in the way.
    if (rand() > p.behaviour.adherence) continue

    startSession(date)
    const session = store().data.sessions[date]
    if (!session) continue
    ev.sessionsDone++

    const total = session.exercises.reduce((n, x) => n + x.sets.length, 0)
    let seen = 0
    for (let ei = 0; ei < session.exercises.length; ei++) {
      const live = store().data.sessions[date]!.exercises[ei]
      // Record what the two prescription engines decided, per tracked lift.
      const asked = askedFor(live.sets[0]?.targetReps ?? '')
      if (Number.isFinite(asked) && plan.trackedLifts.some((t) => t.exerciseId === live.exerciseId)) {
        const arr = track.get(live.exerciseId) ?? []
        arr.push({ week, target: asked, weightLb: live.sets[0]?.weightLb })
        track.set(live.exerciseId, arr)
      }
      const half = Math.ceil(live.sets.length / 2)
      for (let si = 0; si < live.sets.length; si++) {
        seen++
        const cur = store().data.sessions[date]!.exercises[ei]
        const target = askedFor(cur.sets[si]?.targetReps ?? '')
        patchSet(date, ei, si, { done: true })
        // Fatigue accumulates through the day, so the chance of coming up
        // short rises with how much has already been done.
        const p_short = p.behaviour.shortfall + p.behaviour.fade * (seen / total)
        if (Number.isFinite(target) && target > 2 && rand() < p_short) {
          const got = Math.max(1, target - 1 - Math.floor(rand() * 3))
          const said = recordShortfall(date, ei, si, got)
          ev.shortfalls++
          if (said) {
            ev.autoLoadDrops++
            if (notes.length < 40) notes.push(`wk${week} ${getExercise(cur.exerciseId).name}: ${said}`)
          }
        }
        if (si + 1 === half) {
          const left = rand() < p.behaviour.hard ? 0 : p.behaviour.rir
          recordRir(date, ei, si, left)
          ev.rirAnswers++
        }
      }
    }
    finishSession(date)
  }

  // ---- PHASE engine: what twenty weeks earned ----
  const phase = phaseFor(store().data, addDaysISO(START, (PHASE_WEEKS + 1) * 7))
  const final = store().data

  // Load trajectory for the charted lifts.
  const strength = plan.trackedLifts.map((t) => {
    const series = liftSeries(final, t.exerciseId)
    return {
      exerciseId: t.exerciseId,
      label: t.label,
      points: series.length,
      firstE1rm: series[0]?.e1rm ?? null,
      lastE1rm: series[series.length - 1]?.e1rm ?? null,
      firstWeight: series[0]?.weightLb ?? null,
      lastWeight: series[series.length - 1]?.weightLb ?? null,
    }
  })

  // Did the anchors hold all year, and did the accessories still move?
  const anchorsHeld = ['squatVariation', 'press1', 'rowVariation', 'hamstring'].every(
    (s) => !plan.slots[1][s] || (plan.slots[2][s] === plan.slots[1][s] && plan.slots[3][s] === plan.slots[1][s]),
  )
  const accessoriesRotate = ['lowerAccessory', 'press2', 'curl', 'calf', 'coreA', 'coreB'].some(
    (s) => plan.slots[1][s] !== plan.slots[2][s] || plan.slots[2][s] !== plan.slots[3][s],
  )
  const chartedEverywhere = plan.trackedLifts.every((t) => {
    const fixed = Object.values(plan.templates)
      .flatMap((x) => x.entries)
      .some((e) => e.entry === 'fixed' && e.exerciseId === t.exerciseId)
    return fixed || ([1, 2, 3] as const).every((b) => Object.values(plan.slots[b]).includes(t.exerciseId))
  })

  const day1 = resolveDay(START, final)
  return {
    id: p.id,
    who: p.who,
    life: p.life,
    goal: plan.goal,
    goalStatement: plan.goalStatement,
    days: plan.daysPerWeek,
    equipment: plan.equipment.slice(0, 6),
    experience: plan.experience,
    prefs: p.prefs ?? null,
    strategy: gen.strategy,
    anchors: ['squatVariation', 'press1', 'rowVariation', 'hamstring']
      .map((s) => plan.slots[1][s])
      .filter(Boolean)
      .map((id) => getExercise(id).name),
    trackedLifts: plan.trackedLifts.map((t) => t.label),
    coreMovers: plan.coreMovers.slice(0, 8).map((id) => getExercise(id).name),
    firstDay: day1.exercises.map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.repText,
      role: MOVEMENT[e.exerciseId]?.role ?? 'unclassified',
      band: band(e),
      swappedFrom: e.swappedFrom ? getExercise(e.swappedFrom).name : null,
    })),
    firstDayTitle: day1.title,
    firstDaySets: totalSets(day1.exercises),
    ev: {
      ...ev,
      startLighter: [...ev.startLighter].map((id) => getExercise(id).name),
      swapsAuto: [...ev.swapsAuto].map(([from, to]) => `${getExercise(from).name} → ${getExercise(to).name}`),
      minutesMedian: median(ev.minutesTypical),
      minutesTypical: undefined,
    },
    roleAudit,
    track: [...track].map(([id, points]) => ({ name: getExercise(id).name, points })),
    strength,
    invariants: { anchorsHeld, accessoriesRotate, chartedEverywhere },
    phase: {
      index: phase.index,
      verdicts: phase.verdicts.map((v) => ({
        slot: v.slot,
        from: getExercise(v.from).name,
        to: getExercise(v.to).name,
        outcome: v.outcome,
      })),
    },
    notes,
  }
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const out = PERSONAS.map((p) => {
  const t0 = Date.now()
  const r = simulate(p)
  process.stdout.write(`${p.id.padEnd(18)} ${r.ev.sessionsDone}/${r.ev.sessionsPlanned} sessions  ${Date.now() - t0}ms\n`)
  return r
})

const file = process.argv[2] ?? '/tmp/sim.json'
writeFileSync(file, JSON.stringify({ start: START, weeks: WEEKS, personas: out }, null, 2))
console.log(`\nwrote ${out.length} personas to ${file}`)
