import type { EquipTag, Goal, LifeEventKind } from '../../types'
import type { QuickGoal } from './Welcome'

// ============================================================
// What the wizard asks with: the chip sets, the checklists, and
// the one heuristic that reads a typed goal.
//
// Data, not screens. It sat at the top of Onboarding.tsx because
// that is where it was written, and it kept that file over its
// size allowance for months while being the part of it least
// likely to ever change.
// ============================================================

// The real-life checklist: each pick seeds a life event with a label the
// engine's notes will use, so the coaching speaks this user's schedule.
export const LIFE_CHIPS: { id: string; chip: string; label: string; kind: LifeEventKind }[] = [
  { id: 'night-shift', chip: '🌙 Night shifts', label: 'Night shift', kind: 'late-night' },
  { id: 'late-gig', chip: '🎤 Gigs / late events', label: 'Late gig', kind: 'late-night' },
  { id: 'on-feet', chip: '🦵 On my feet at work', label: 'On-feet shift', kind: 'on-feet' },
  { id: 'kids', chip: '👶 Up nights with kids', label: 'Up with the kids', kind: 'late-night' },
]

/** Best-guess training category from a free-typed goal, so ANY goal picks
    its engine automatically. Returns a GOAL_CHIPS index, or null. */
export function inferGoal(text: string): number | null {
  const t = text.toLowerCase()
  if (t.length < 4) return null
  const pick = (g: Goal) => {
    const i = GOAL_CHIPS.findIndex((c) => c.goal === g)
    return i === -1 ? null : i
  }
  if (/dunk|vertical|jump higher|bounce|rim/.test(t)) return pick('vertical')
  if (/marathon|\b5 ?k|\b10 ?k|ultra|\b50 ?k|\b100 ?k|\b50 ?mi|triathlon|endurance|run (a|my|further)|race/.test(t)) return pick('endurance')
  if (/sprint|faster|speed|40 ?yard|agility/.test(t)) return pick('speed')
  if (/lose|cut|lean|shred|fat|slim|abs|toned?/.test(t)) return pick('lean')
  if (/muscle|bulk|bigger|mass|gain \d+|jacked|physique/.test(t)) return pick('muscle')
  if (/strength|stronger|bench|squat|deadlift|\b\d{3}\b|1 ?rm|powerlift/.test(t)) return pick('strength')
  if (/health|energy|fit|shape|moving|active/.test(t)) return pick('general')
  return null
}

export const GOAL_CHIPS: { label: string; goal: Goal }[] = [
  { label: '💪 Build muscle', goal: 'muscle' },
  { label: '🔥 Lose weight', goal: 'lean' },
  { label: '🏋️ Get strong', goal: 'strength' },
  { label: '✂️ Get lean & defined', goal: 'lean' },
  { label: '🫀 Health & energy', goal: 'general' },
  { label: '🧍 Get moving again', goal: 'general' },
  { label: '⚡ Get faster', goal: 'speed' },
  { label: '🏅 Dominate my sport', goal: 'speed' },
  { label: '🏃 Run further / race', goal: 'endurance' },
  { label: '🎯 All-around athlete', goal: 'general' },
  { label: '⬆️ Jump higher', goal: 'vertical' },
  { label: '🏀 Dunk a basketball', goal: 'vertical' },
]

// Five goals with nothing in common, so the welcome screen demonstrates
// the app's range instead of asserting it. `chip` indexes GOAL_CHIPS.
export const QUICK_GOALS: QuickGoal[] = [
  { label: '🏀 Dunk a basketball', statement: 'dunk on a 10-ft rim', chip: 11 },
  { label: '🔥 Lose 40 lb', statement: 'lose 40 lb', chip: 1 },
  { label: '🏃 First marathon', statement: 'finish my first marathon', chip: 8 },
  { label: '🏋️ Bench 225', statement: 'bench 225', chip: 2 },
  { label: '🫀 Get my energy back', statement: 'get my energy back', chip: 4 },
]

/** Home-gym checklist: nothing is assumed, each item grants its tags. */
export const HOME_CHECKLIST: { tags: EquipTag[]; label: string }[] = [
  { tags: ['dumbbell'], label: 'Dumbbells' },
  { tags: ['barbell', 'plate'], label: 'Barbell + plates' },
  { tags: ['rack'], label: 'Squat rack' },
  { tags: ['bench'], label: 'Flat bench' },
  { tags: ['incline-bench'], label: 'Incline bench' },
  { tags: ['pullup-bar'], label: 'Pull-up bar' },
  { tags: ['box'], label: 'Plyo box' },
  { tags: ['kettlebell'], label: 'Kettlebell' },
  { tags: ['trap-bar'], label: 'Trap bar' },
  { tags: ['med-ball'], label: 'Med ball' },
  { tags: ['band'], label: 'Bands' },
  { tags: ['machine'], label: 'Machines / cables' },
  { tags: ['treadmill'], label: 'Treadmill' },
  { tags: ['sled'], label: 'Sled' },
  { tags: ['cones'], label: 'Cones' },
  { tags: ['hurdle'], label: 'Mini hurdles' },
]

/** Environment access, asked per profile on top of the gear itself. */
export const ENV_EXTRAS: Record<'gym' | 'home-db' | 'minimal', { tags: EquipTag[]; label: string }[]> = {
  gym: [
    { tags: ['court'], label: 'Hoop / court' },
  ],
  'home-db': [
    { tags: ['court'], label: 'Hoop / court' },
    { tags: ['hill-stairs'], label: 'Hill or stairs' },
  ],
  minimal: [
    { tags: ['pullup-bar'], label: 'Park pull-up bar' },
    { tags: ['box'], label: 'Box / ledge to jump on' },
    { tags: ['court'], label: 'Hoop / court' },
    { tags: ['hill-stairs'], label: 'Hill or stairs' },
  ],
}

export const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
