import type { CustomTarget, DayTemplate, Goal, PlanConfig, TemplateEntry, Weekday } from '../types'
import { getExercise, EXERCISES } from './exercises'
import { equipFor } from './equip'
import { buildNutrition, pickCardio, rationaleFor } from './generator'
import type { EquipTag } from '../types'

// ============================================================
// Booklet operations: the pure commit path behind the editor
// and the bring-your-own-routine flow. Normalization derives
// everything the engine needs (tiers, anchors, tracked lifts,
// rationale) from whatever week the user assembled.
// ============================================================

const ALL_TAGS: EquipTag[] = [
  'dumbbell', 'barbell', 'bench', 'incline-bench', 'rack', 'pullup-bar',
  'box', 'plate', 'machine', 'open-space', 'hill-stairs', 'court', 'treadmill',
]

/** A blank booklet for the bring-your-own-routine builder. */
export function makeEmptyByorPlan(
  goal: Goal,
  goalStatement: string,
  customTargets: CustomTarget[],
  bodyweightLb: number,
): { plan: PlanConfig; proteinTargetG: number } {
  const owned = new Set<EquipTag>(['none', ...ALL_TAGS])
  const n = buildNutrition(goal, bodyweightLb)
  return {
    proteinTargetG: n.proteinTargetG,
    plan: {
      planVersion: 1,
      name: 'My Routine',
      goal,
      goalStatement: goalStatement.trim() || 'My routine, done right',
      customTargets,
      copyFlavor: goal === 'vertical' || goal === 'speed' ? 'explosive' : goal === 'muscle' || goal === 'lean' ? 'physique' : 'general',
      daysPerWeek: 0,
      equipment: ALL_TAGS,
      templates: {},
      tier1ByWeekday: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      tierRoleTemplates: { 2: {}, 3: {} },
      tierDefaultPlacement: { 2: {}, 3: {} },
      slots: { 1: {}, 2: {}, 3: {} },
      slotRepOverrides: {},
      cardioOptions: pickCardio(owned),
      trackedLifts: [],
      coreMovers: [],
      anchors: { conditioningWeekday: 4, cnsWeekdays: [] },
      lifeRules: { djWeekend: false, longShiftMonday: false },
      rationale: {},
      nutrition: { kcalTraining: n.kcalTraining, kcalRest: n.kcalRest },
    },
  }
}

/** Every exercise id a booklet references (templates, slots, minViable, cardio). */
export function referencedIds(plan: PlanConfig): Set<string> {
  const out = new Set<string>()
  for (const t of Object.values(plan.templates)) {
    for (const e of t.entries) {
      if (e.entry === 'fixed') out.add(e.exerciseId)
      else if (e.entry === 'slot') {
        for (const b of [1, 2, 3] as const) {
          const id = plan.slots[b]?.[e.slot]
          if (id) out.add(id)
        }
      } else {
        out.add(e.a.exerciseId)
        out.add(e.b.exerciseId)
      }
    }
    for (const i of t.minViable?.items ?? []) out.add(i.exerciseId)
  }
  for (const c of plan.cardioOptions) out.add(c.exerciseId)
  return out
}

/** Human-readable problems that must be fixed before a booklet can be saved. */
export function validateBooklet(plan: PlanConfig): string[] {
  const problems: string[] = []
  const assigned = Object.values(plan.tier1ByWeekday).filter(Boolean) as string[]
  if (assigned.length === 0) problems.push('Add at least one training day to the week.')
  for (const tid of new Set(assigned)) {
    const t = plan.templates[tid]
    if (!t) {
      problems.push(`A weekday points at a missing day (${tid}).`)
      continue
    }
    if (t.kind === 'session' && t.entries.length < 2) {
      problems.push(`“${t.title}” needs at least 2 exercises.`)
    }
    if (!t.title.trim()) problems.push('Every training day needs a name.')
  }
  for (const id of referencedIds(plan)) {
    if (!EXERCISES[id]) problems.push(`Unknown exercise: ${id}`)
  }
  if (!plan.name.trim()) problems.push('Give the booklet a name.')
  return problems
}

function trimClone(t: DayTemplate, id: string, max: number): DayTemplate {
  const entries = t.entries.slice(0, Math.max(2, max))
  return { ...t, id, entries, minViable: minViableOf(entries) }
}

function minViableOf(entries: TemplateEntry[]): DayTemplate['minViable'] {
  const items = entries
    .filter((e): e is Extract<TemplateEntry, { entry: 'fixed' }> => e.entry === 'fixed')
    .slice(0, 2)
    .map((e) => ({ exerciseId: e.exerciseId, sets: Math.max(1, Math.ceil(e.sets / 2)), repText: e.repText, repsNum: e.repsNum }))
  return items.length >= 2 ? { label: 'The bare minimum', items } : undefined
}

function templateSets(t: DayTemplate): number {
  return t.entries.reduce((s, e) => s + ('sets' in e ? e.sets : e.a.sets), 0)
}

/**
 * Normalize an edited/assembled booklet: prune dead references, refresh
 * min-viables, regenerate tier fallbacks and anchors, recompute tracked
 * lifts / core movers, and fill rationale for anything new. Existing
 * rationale lines are preserved (the owner's NAOD prose survives edits).
 */
export function normalizeBooklet(draft: PlanConfig): PlanConfig {
  const plan: PlanConfig = structuredClone(draft)

  // Prune weekdays pointing at missing/empty templates
  for (const wd of Object.keys(plan.tier1ByWeekday)) {
    const tid = plan.tier1ByWeekday[Number(wd) as Weekday]
    if (tid && (!plan.templates[tid] || plan.templates[tid].entries.length === 0)) {
      plan.tier1ByWeekday[Number(wd) as Weekday] = null
    }
  }
  // Drop templates no weekday or tier map uses (except tier variants we regenerate below)
  const used = new Set(Object.values(plan.tier1ByWeekday).filter(Boolean) as string[])
  plan.daysPerWeek = used.size === 0 ? 0 : (Object.values(plan.tier1ByWeekday).filter(Boolean) as string[]).length

  // Refresh min-viable on every kept session template
  for (const t of Object.values(plan.templates)) {
    if (t.kind === 'session') t.minViable = minViableOf(t.entries)
  }

  // ---- Tier fallbacks regenerate from the assembled week ----
  const sessions = [...used]
    .map((tid) => plan.templates[tid])
    .filter((t): t is DayTemplate => !!t && t.kind === 'session')
    .sort((a, b) => templateSets(b) - templateSets(a))
  if (sessions.length > 0) {
    const biggest = sessions[0]
    const second = sessions[1] ?? sessions[0]
    plan.templates['t2-lower'] = trimClone(biggest, 't2-lower', 4)
    plan.templates['t2-upper'] = trimClone(second, 't2-upper', 4)
    plan.templates['t3-fullbody'] = trimClone(biggest, 't3-fullbody', 4)
    const cnsTemplate = sessions.find((t) => t.cns)
    if (cnsTemplate) {
      plan.templates['t3-explosive'] = trimClone(cnsTemplate, 't3-explosive', 4)
      plan.tierRoleTemplates = {
        2: { lower: 't2-lower', upper: 't2-upper', explosive: cnsTemplate.id },
        3: { fullbody: 't3-fullbody', explosive: 't3-explosive' },
      }
      plan.tierDefaultPlacement = { 2: { lower: 1, upper: 3, explosive: 6 }, 3: { fullbody: 3, explosive: 6 } }
    } else {
      plan.tierRoleTemplates = { 2: { lower: 't2-lower', upper: 't2-upper' }, 3: { fullbody: 't3-fullbody' } }
      plan.tierDefaultPlacement = { 2: { lower: 1, upper: 4 }, 3: { fullbody: 3 } }
    }
  }

  // ---- Anchors ----
  const mobilityWd = (Object.entries(plan.tier1ByWeekday) as [string, string | null][])
    .find(([, tid]) => tid && plan.templates[tid]?.kind === 'mobility')?.[0]
  const free = ([4, 3, 2, 0] as Weekday[]).filter((wd) => !plan.tier1ByWeekday[wd])
  plan.anchors.conditioningWeekday = (mobilityWd !== undefined ? Number(mobilityWd) : free[0] ?? 0) as Weekday
  plan.anchors.cnsWeekdays = (Object.entries(plan.tier1ByWeekday) as [string, string | null][])
    .filter(([, tid]) => tid && plan.templates[tid]?.cns)
    .map(([wd]) => Number(wd) as Weekday)

  // ---- Tracked lifts + core movers from what the plan actually contains ----
  const refs = referencedIds(plan)
  const loaded = (id: string) => {
    const def = EXERCISES[id]
    return !!def && def.kind === 'lift' && equipFor(id).some((t) => t === 'dumbbell' || t === 'barbell' || t === 'machine')
  }
  plan.trackedLifts = [...refs].filter(loaded).slice(0, 6).map((id) => ({
    exerciseId: id,
    label: getExercise(id).name.replace(/\s*\(.*\)$/, ''),
  }))
  plan.coreMovers = [...new Set(
    Object.values(plan.templates)
      .filter((t) => t.kind === 'session')
      .flatMap((t) => t.entries)
      .filter((e): e is Extract<TemplateEntry, { entry: 'fixed' }> => e.entry === 'fixed')
      .map((e) => e.exerciseId)
      .filter((id) => EXERCISES[id] && ['lift', 'core', 'carry'].includes(EXERCISES[id].kind)),
  )]

  // ---- Rationale: keep what exists, write lines for anything new ----
  const generated = rationaleFor(plan.goal, plan.goalStatement, [...refs])
  const merged: Record<string, string> = {}
  for (const id of refs) merged[id] = plan.rationale[id] ?? generated[id]
  plan.rationale = merged

  return plan
}
