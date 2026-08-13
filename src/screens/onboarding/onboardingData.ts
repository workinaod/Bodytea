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
export /**
 * The real-life things that should bend a plan.
 *
 * There were four, and all four were one person's week: night shifts,
 * gigs, on-feet work, up with the kids. Everybody else picked nothing
 * and got a plan built for somebody with an empty calendar. These are
 * the ones that genuinely change WHEN somebody can train and how much
 * they will have left when they get there.
 */
const LIFE_CHIPS: { id: string; chip: string; label: string; kind: LifeEventKind }[] = [
  { id: 'night-shift', chip: '🌙 Night shifts', label: 'Night shift', kind: 'late-night' },
  { id: 'early-start', chip: '🌅 Very early starts', label: 'Early start', kind: 'late-night' },
  { id: 'long-hours', chip: '💼 Long work days', label: 'Long day', kind: 'on-feet' },
  { id: 'on-feet', chip: '🦵 On my feet all day', label: 'On-feet shift', kind: 'on-feet' },
  { id: 'heavy-job', chip: '🧱 Physical job', label: 'Physical job', kind: 'on-feet' },
  { id: 'kids', chip: '👶 Broken sleep, young kids', label: 'Up with the kids', kind: 'late-night' },
  { id: 'caring', chip: '🧡 Caring for someone', label: 'Caring day', kind: 'on-feet' },
  { id: 'commute', chip: '🚆 Long commute', label: 'Long commute', kind: 'on-feet' },
  { id: 'study', chip: '📚 Studying / exams', label: 'Study block', kind: 'late-night' },
  { id: 'sport-night', chip: '⚽ I already play a sport', label: 'Match day', kind: 'on-feet' },
  { id: 'late-gig', chip: '🎤 Gigs or late events', label: 'Late gig', kind: 'late-night' },
  { id: 'travel-work', chip: '✈️ Travel for work', label: 'Travel day', kind: 'on-feet' },
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
  if (/strong|strength|bench|squat|deadlift|\b\d{3}\b|1 ?rm|powerlift/.test(t)) return pick('strength')
  if (/health|energy|fit|shape|moving|active/.test(t)) return pick('general')
  return null
}

/**
 * The starting points, each with the sentence it writes for you.
 *
 * Picking one used to leave the "in your own words" box empty and the
 * button dead, so a person who had just answered the question was
 * told to answer it again. A chip is a draft now: it fills the box
 * with a plain sentence you can edit or replace, which is what "pick
 * one to start from" should have meant all along.
 */
export const GOAL_CHIPS: { label: string; goal: Goal; statement: string }[] = [
  { label: '🔥 Lose weight', goal: 'lean', statement: 'lose weight and keep it off' },
  { label: '💪 Build muscle', goal: 'muscle', statement: 'put on muscle' },
  { label: '🫀 More energy', goal: 'general', statement: 'have more energy day to day' },
  { label: '🏋️ Get stronger', goal: 'strength', statement: 'get properly strong' },
  { label: '✂️ Get toned', goal: 'lean', statement: 'lean out and look more defined' },
  { label: '🧍 Start moving again', goal: 'general', statement: 'get back into it after a long time off' },
  { label: '🏃 Run further', goal: 'endurance', statement: 'run further than I can now' },
  { label: '🏅 Get better at my sport', goal: 'speed', statement: 'get better at my sport' },
  { label: '⚡ Get faster', goal: 'speed', statement: 'get faster' },
  { label: '🎯 All-round fitness', goal: 'general', statement: 'be fit and capable at everything' },
  { label: '⬆️ Jump higher', goal: 'vertical', statement: 'jump higher' },
  { label: '👵 Keep up with my kids', goal: 'general', statement: 'keep up with my kids without getting winded' },
]

// Five goals with nothing in common, so the welcome screen demonstrates
// the app's range instead of asserting it. `chip` indexes GOAL_CHIPS.
/**
 * The five on the very first screen.
 *
 * The old five were one person's life — dunk a basketball, bench 225,
 * first marathon. Three of those are the tail end of two goals, so a
 * 45-year-old who wants to stop being out of breath opened the app and
 * saw nothing for her. These are the goals people actually arrive with,
 * and they still point five different directions — lose, build, feel
 * better, go further, get strong — so the screen proves the range
 * instead of asserting it.
 *
 * They name their goal rather than an INDEX into the chip list. The
 * index version silently broke the moment that list was reordered:
 * four of five landing chips seeded the wrong plan and nothing said so.
 */
export const QUICK_GOALS: QuickGoal[] = [
  { label: '🔥 Lose weight', statement: 'lose weight and keep it off', goal: 'lean' },
  { label: '🫀 Get my energy back', statement: 'get my energy back', goal: 'general' },
  { label: '💪 Build muscle', statement: 'put on muscle', goal: 'muscle' },
  { label: '🏃 Run a 5K', statement: 'run a 5K without stopping', goal: 'endurance' },
  { label: '🏋️ Get strong again', statement: 'get strong again', goal: 'strength' },
]

/** Where a landing goal lands in the chip grid. Never an index in data. */
export const chipIndexForGoal = (goal: Goal): number | null => {
  const i = GOAL_CHIPS.findIndex((c) => c.goal === goal)
  return i === -1 ? null : i
}

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
type Access = { tags: EquipTag[]; label: string }

/**
 * Places, asked per GOAL rather than per gym.
 *
 * Everybody used to get the same question, and for most of them it was
 * "do you have a hoop?" — which is the right question for one goal and
 * noise for the other six. Somebody with 40 lb to lose does not have a
 * court; they have a park, and nobody asked.
 */
const GOAL_ACCESS: Record<Goal, Access[]> = {
  vertical: [
    { tags: ['court'], label: 'Hoop or court' },
    { tags: ['box'], label: 'Something safe to jump onto' },
    { tags: ['open-space'], label: 'Grass or open space' },
  ],
  speed: [
    { tags: ['track'], label: 'Running track' },
    { tags: ['open-space'], label: 'Field or open grass' },
    { tags: ['hill-stairs'], label: 'A hill or stairs' },
    { tags: ['court'], label: 'Hoop or court' },
  ],
  endurance: [
    { tags: ['track'], label: 'Running track' },
    { tags: ['trail'], label: 'Trails or paths' },
    { tags: ['treadmill'], label: 'Treadmill' },
    { tags: ['hill-stairs'], label: 'A hill or stairs' },
    { tags: ['pool'], label: 'Pool' },
    { tags: ['bike'], label: 'A bike' },
  ],
  lean: [
    { tags: ['trail'], label: 'Park, trails or paths' },
    { tags: ['treadmill'], label: 'Treadmill' },
    { tags: ['hill-stairs'], label: 'A hill or stairs' },
    { tags: ['pool'], label: 'Pool' },
    { tags: ['bike'], label: 'A bike' },
  ],
  general: [
    { tags: ['trail'], label: 'Park, trails or paths' },
    { tags: ['pool'], label: 'Pool' },
    { tags: ['bike'], label: 'A bike' },
    { tags: ['hill-stairs'], label: 'A hill or stairs' },
  ],
  muscle: [
    { tags: ['pullup-bar'], label: 'Somewhere to pull up' },
    { tags: ['open-space'], label: 'Room to move' },
  ],
  strength: [
    { tags: ['pullup-bar'], label: 'Somewhere to pull up' },
    { tags: ['open-space'], label: 'Room to move' },
  ],
}

/** Kit that has to be asked about when the room is bare, whatever the goal. */
const MINIMAL_EXTRAS: Access[] = [
  { tags: ['pullup-bar'], label: 'Pull-up bar' },
  { tags: ['band'], label: 'Resistance bands' },
  { tags: ['kettlebell'], label: 'A kettlebell' },
]

/** What to offer THIS person: their goal's places, plus kit if the room is bare. */
export function accessFor(goal: Goal, profile: 'gym' | 'home-db' | 'minimal'): Access[] {
  const places = GOAL_ACCESS[goal] ?? []
  // A full gym already has the treadmill and the space; asking again
  // reads as the app not remembering what it just asked.
  const dropIfGym = new Set(['treadmill', 'open-space', 'box', 'pullup-bar'])
  const filtered = profile === 'gym' ? places.filter((a) => !a.tags.some((t) => dropIfGym.has(t))) : places
  return profile === 'minimal' ? [...MINIMAL_EXTRAS, ...filtered] : filtered
}

/** Kept for the profile switcher, which needs every tag any profile can show. */
export const ENV_EXTRAS: Record<'gym' | 'home-db' | 'minimal', Access[]> = {
  gym: Object.values(GOAL_ACCESS).flat(),
  'home-db': Object.values(GOAL_ACCESS).flat(),
  minimal: [...MINIMAL_EXTRAS, ...Object.values(GOAL_ACCESS).flat()],
}

export const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
