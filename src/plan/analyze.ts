import type { PlanConfig, TemplateEntry } from '../types'
import { getExercise } from './exercises'
import { EXERCISE_MUSCLES } from './muscles'

// ============================================================
// Routine analysis: honest coach notes on any booklet — used
// when someone plugs in their own routine, and re-run whenever
// a booklet is edited. Pure over PlanConfig.
// ============================================================

export interface RoutineNote {
  id: string
  tone: 'good' | 'warn' | 'info'
  text: string
}

const PUSH_MUSCLES = new Set(['chest', 'chest-upper', 'delts-front', 'delts-side', 'triceps'])
const PULL_MUSCLES = new Set(['lats', 'mid-back', 'delts-rear', 'biceps', 'traps'])
const HINGE_IDS = new Set([
  'romanian-deadlift', 'db-rdl', 'single-leg-rdl', 'good-morning', 'glute-bridge', 'hip-thrust',
])

interface Tally {
  push: number
  pull: number
  quads: number
  posterior: number
  core: number
  explosive: number
  hinge: boolean
  perDaySets: { title: string; sets: number }[]
  sessionDays: number
  trainingDays: number
  lowerDays: number
}

function entryExerciseIds(plan: PlanConfig, e: TemplateEntry): string[] {
  if (e.entry === 'fixed') return [e.exerciseId]
  if (e.entry === 'slot') {
    const id = plan.slots[1]?.[e.slot]
    return id ? [id] : []
  }
  return [e.a.exerciseId]
}

function tally(plan: PlanConfig): Tally {
  const t: Tally = {
    push: 0, pull: 0, quads: 0, posterior: 0, core: 0, explosive: 0,
    hinge: false, perDaySets: [], sessionDays: 0, trainingDays: 0, lowerDays: 0,
  }
  const seenTemplates = new Set<string>()
  for (const tid of Object.values(plan.tier1ByWeekday)) {
    if (!tid) continue
    t.trainingDays++
    if (seenTemplates.has(tid)) continue
    seenTemplates.add(tid)
    const tpl = plan.templates[tid]
    if (!tpl) continue
    if (tpl.kind !== 'session') continue
    t.sessionDays++
    let daySets = 0
    let dayLower = 0
    for (const e of tpl.entries) {
      const sets = 'sets' in e ? e.sets : e.a.sets
      for (const id of entryExerciseIds(plan, e)) {
        const def = getExercise(id)
        const primary = EXERCISE_MUSCLES[id]?.primary ?? []
        daySets += sets
        if (def.kind === 'sprint' || def.kind === 'jump') t.explosive += sets
        if (def.kind === 'core' || primary.some((m) => m === 'abs' || m === 'obliques')) t.core += sets
        if (primary.some((m) => PUSH_MUSCLES.has(m))) t.push += sets
        if (primary.some((m) => PULL_MUSCLES.has(m))) t.pull += sets
        if (primary.includes('quads')) { t.quads += sets; dayLower += sets }
        if (primary.some((m) => m === 'glutes' || m === 'hamstrings')) { t.posterior += sets; dayLower += sets }
        if (HINGE_IDS.has(id)) t.hinge = true
      }
    }
    if (dayLower >= 6) t.lowerDays++
    t.perDaySets.push({ title: tpl.title, sets: daySets })
  }
  return t
}

/** Coach notes on a booklet, ordered most important first. */
export function analyzeRoutine(plan: PlanConfig): RoutineNote[] {
  const t = tally(plan)
  const notes: RoutineNote[] = []
  const goalWord = `“${plan.goalStatement}”`
  const rg = plan.routineGoals ?? []

  // ---- Goal fit ----
  if ((plan.goal === 'vertical' || plan.goal === 'speed' || rg.includes('athletic')) && t.explosive === 0) {
    notes.push({
      id: 'no-explosive',
      tone: 'warn',
      text: `Your goal is ${goalWord} but nothing in this routine trains jumping or sprinting itself. Strength feeds the engine — jumps and sprints ARE the engine. Add a jump or sprint drill on a fresh day.`,
    })
  }
  if ((plan.goal === 'muscle' || rg.includes('muscle')) && t.lowerDays === 0) {
    notes.push({
      id: 'no-lower-day',
      tone: 'warn',
      text: `Chasing ${goalWord} with no real lower-body day. Legs are half your muscle mass and the biggest growth signal you can send. One dedicated lower day minimum.`,
    })
  }
  if (rg.includes('muscle') && rg.includes('lose-weight')) {
    notes.push({
      id: 'recomp',
      tone: 'info',
      text: 'Muscle up AND weight down at the same time is a recomp — real, but slow. Calories are set near maintenance, the protein target is non-negotiable, and the win condition is strength holding while the scale drifts. Judge it monthly, not daily.',
    })
  } else if (rg.includes('lose-weight')) {
    notes.push({
      id: 'cut-fuel',
      tone: 'info',
      text: 'Losing weight is won in the kitchen — your calorie target sits below maintenance and the protein floor protects the muscle. This routine’s job is to make the loss read as fat, not strength. Keep the weights heavy; the deficit does the cutting.',
    })
  }
  if (rg.length === 1 && rg[0] === 'maintain') {
    notes.push({
      id: 'maintain-mode',
      tone: 'info',
      text: 'Maintenance mode: the bar is showing up, not adding weight. Deloads and A/B weeks keep it fresh, and any PR that happens anyway is a free win the tracker will catch.',
    })
  }

  // ---- Their own read on why it works ----
  const why = (plan.whyWorks ?? '').trim()
  if (why) {
    const w = why.toLowerCase()
    if (/(overload|heavier|add(ing|ed)? weight|stronger|progress|\bprs?\b|went up|going up)/.test(w)) {
      notes.push({
        id: 'why-overload',
        tone: 'good',
        text: 'You said it yourself — the weight keeps going up. That’s progressive overload, the one lever that matters most, and the PR tracker now keeps receipts on it. If the bar ever stalls for a month, that’s your signal, not a mystery.',
      })
    } else if (/(consisten|show(ing|ed)? up|every (day|week|session)|habit|stick|never miss|discipline|routine)/.test(w)) {
      notes.push({
        id: 'why-consistency',
        tone: 'good',
        text: 'You credited showing up — correct. Consistency beats a perfect plan every single time, and your streak is now on your profile where you can’t un-see it. Protect the reason it’s been easy to show up; that’s the actual engine.',
      })
    } else if (/(pain|hurt|injur|joint|knee|shoulder|back)/.test(w)) {
      notes.push({
        id: 'why-painfree',
        tone: 'good',
        text: 'It’s been working because nothing hurts — that’s not luck, that’s exercise selection that fits your body. Rotate carefully: when the app suggests swaps, keep the joint-friendly picks that earned their place.',
      })
    } else {
      notes.push({
        id: 'why-noted',
        tone: 'info',
        text: `Your read is on record: “${why.length > 90 ? `${why.slice(0, 90)}…` : why}”. The notes here are checked against it — if the structure ever stops backing that story, the coach says so to your face.`,
      })
    }
  }

  // ---- Balance ----
  if (t.push > 0 && t.pull === 0) {
    notes.push({
      id: 'zero-pull',
      tone: 'warn',
      text: 'All press, zero pull. That imbalance is how shoulders start hurting. Match your pressing with rows or pull-ups — the back you build also protects the pressing you love.',
    })
  } else if (t.pull > 0 && t.push / Math.max(1, t.pull) > 1.6) {
    notes.push({
      id: 'push-heavy',
      tone: 'warn',
      text: `Pressing outweighs pulling ${t.push} sets to ${t.pull}. Shoulders stay healthy near 1:1 — add rowing volume before it becomes a problem.`,
    })
  } else if (t.push > 0 && t.pull > 0) {
    notes.push({
      id: 'push-pull-balanced',
      tone: 'good',
      text: `Push/pull balance checks out (${t.push} sets pressing vs ${t.pull} pulling). That ratio is what keeps shoulders healthy for years.`,
    })
  }

  if (!t.hinge && (t.quads > 0 || t.posterior > 0)) {
    notes.push({
      id: 'no-hinge',
      tone: 'warn',
      text: 'No hip hinge anywhere (RDL / good morning / hip thrust family). The hinge builds the glutes and hamstrings every sprint, jump, and heavy pickup runs on. Add one.',
    })
  } else if (t.hinge) {
    notes.push({
      id: 'hinge-present',
      tone: 'good',
      text: 'A real hinge is in the plan — the posterior chain gets its work. That is the most-skipped pattern in home routines and you did not skip it.',
    })
  }

  if (t.quads > 0 && t.posterior === 0) {
    notes.push({
      id: 'quad-only',
      tone: 'warn',
      text: 'All quad, no glute/hamstring work. The backside is the athletic side — balance the squatting with hinging or bridging.',
    })
  }

  if (t.core === 0 && t.sessionDays > 0) {
    notes.push({
      id: 'no-core',
      tone: 'info',
      text: 'No direct core work. The trunk transfers every pound of force you produce — two hard sets at the end of a day is enough.',
    })
  }

  // ---- Structure ----
  if (t.trainingDays >= 7) {
    notes.push({
      id: 'no-rest-day',
      tone: 'warn',
      text: 'Seven days scheduled, zero rest. Growth happens in the recovery you are not scheduling. The plan keeps at least one full rest day.',
    })
  }
  for (const d of t.perDaySets) {
    if (d.sets > 25) {
      notes.push({
        id: `marathon-${d.title}`,
        tone: 'warn',
        text: `“${d.title}” is ${d.sets} working sets — a marathon. Quality collapses long before the end. Cap a day around 20 hard sets and move the rest elsewhere.`,
      })
    } else if (d.sets > 0 && d.sets < 6) {
      notes.push({
        id: `snack-${d.title}`,
        tone: 'info',
        text: `“${d.title}” is only ${d.sets} sets. Fine as a quick day — just know it is a snack, not a meal.`,
      })
    }
  }

  notes.push({
    id: 'deload-auto',
    tone: 'info',
    text: 'Built in for you: every 4th week is an automatic deload (sets halved, same weights), A/B weeks alternate your accessories, and busy weeks can drop to lighter fallback tiers without losing the thread.',
  })

  const order = { warn: 0, good: 1, info: 2 }
  return notes.sort((a, b) => order[a.tone] - order[b.tone])
}
