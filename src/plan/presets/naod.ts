import type { PlanConfig } from '../../types'
import {
  CARDIO_OPTIONS,
  TEMPLATES,
  TIER1_BY_WEEKDAY,
  TIER_DEFAULT_PLACEMENT,
  TIER_ROLE_TEMPLATES,
} from '../templates'
import { BLOCK_SLOTS, CORE_MOVERS, SLOT_REPTEXT_OVERRIDES, TRACKED_LIFTS } from '../blocks'
import { EXERCISES } from '../exercises'

// ============================================================
// The owner's booklet: NAOD V3 as a PlanConfig. Assembled from
// the same static modules the app has always shipped, so the
// preset is byte-equivalent to the original plan by
// construction — the golden snapshot test enforces it.
// ============================================================

/** Debrief/recovery pool per NAOD template (role-keyed pools in plan/debrief.ts). */
const DEBRIEF_KEYS: Record<string, string> = {
  monday: 'power',
  tuesday: 'push',
  wednesday: 'lower',
  thursday: 'mobility',
  friday: 'pull',
  saturday: 'speed',
  't2-lower': 'lower',
  't2-upper': 'push',
  't3-fullbody': 'lower',
  't3-explosive': 'speed',
}

export function buildNaodPreset(): PlanConfig {
  const templates = Object.fromEntries(
    Object.entries(TEMPLATES).map(([id, t]) => [id, { ...t, debriefKey: DEBRIEF_KEYS[id] }]),
  )
  // The owner's "why it's in YOUR plan" prose, frozen verbatim per exercise.
  const rationale = Object.fromEntries(Object.values(EXERCISES).map((e) => [e.id, e.why]))
  return {
    planVersion: 1,
    name: 'NAOD V4',
    goal: 'vertical',
    goalStatement: 'Consistent dunks, elite speed, and a build that shows it.',
    customTargets: [],
    copyFlavor: 'explosive',
    daysPerWeek: 6,
    equipment: [
      'dumbbell', 'barbell', 'bench', 'incline-bench', 'pullup-bar',
      'box', 'plate', 'open-space', 'hill-stairs', 'court',
    ],
    templates,
    tier1ByWeekday: { ...TIER1_BY_WEEKDAY },
    tierRoleTemplates: { 2: { ...TIER_ROLE_TEMPLATES[2] }, 3: { ...TIER_ROLE_TEMPLATES[3] } },
    tierDefaultPlacement: { 2: { ...TIER_DEFAULT_PLACEMENT[2] }, 3: { ...TIER_DEFAULT_PLACEMENT[3] } },
    slots: { 1: { ...BLOCK_SLOTS[1] }, 2: { ...BLOCK_SLOTS[2] }, 3: { ...BLOCK_SLOTS[3] } },
    slotRepOverrides: { ...SLOT_REPTEXT_OVERRIDES },
    cardioOptions: CARDIO_OPTIONS.map((c) => ({ ...c })),
    trackedLifts: TRACKED_LIFTS.map((t) => ({ ...t })),
    coreMovers: [...CORE_MOVERS],
    anchors: { conditioningWeekday: 4, cnsWeekdays: [1, 6] },
    lifeRules: { djWeekend: true, longShiftMonday: true },
    lifeEvents: [
      { id: 'dj', label: 'DJ set / late night', kind: 'late-night' },
      { id: 'shift', label: 'Long shift on your feet', kind: 'on-feet' },
    ],
    rationale,
    nutrition: { kcalTraining: 2800, kcalRest: 2500 },
  }
}
