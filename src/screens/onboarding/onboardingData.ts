import type { EquipTag, Goal, LifeEventKind } from '../../types'
import { canRealisticallyDunk, leadingGoal } from '../../plan/reach'

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
export interface GoalChip {
  label: string
  goal: Goal
  statement: string
  /**
   * A goal that is only worth OFFERING to some people. Not a lock —
   * anything here can still be typed by hand and gets the same plan.
   * This decides what goes on the screen, not what is allowed.
   */
  requires?: 'dunk'
}

export const GOAL_CHIPS: GoalChip[] = [
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
  // Off the screen for most people, and on it for the ones it is real
  // for. It was removed outright once, correctly, because it was being
  // shown to everybody — including people who would need a 36-inch
  // vertical, which is a promise the app cannot keep. Height is what
  // makes it a question worth asking.
  { label: '🏀 Dunk a basketball', goal: 'vertical', statement: 'dunk a basketball', requires: 'dunk' },
]

/**
 * Which goals to put on the screen, in what order, for this body.
 *
 * Returns INDEXES into GOAL_CHIPS, never a rebuilt list. The chip the
 * user picks is stored as an index, so a list that reordered itself per
 * person would mean the same stored answer meant different goals for
 * different people — a worse version of the bug where the landing
 * buttons carried a position into a grid that got reordered.
 *
 * Nothing is ever hidden on the basis of weight. The one gate is
 * physical: a rim is 120 inches off the floor whoever is looking at it.
 */
export function visibleGoalChips(body: { heightIn?: number; weightLb?: number }): number[] {
  const idx = GOAL_CHIPS.map((_, i) => i).filter(
    (i) => GOAL_CHIPS[i].requires !== 'dunk' || canRealisticallyDunk(body.heightIn),
  )
  const lead = leadingGoal(body.weightLb, body.heightIn)
  if (!lead) return idx
  // Promoted, not isolated: the whole list is still there in the same
  // order behind it, and nothing on screen says why.
  const first = idx.filter((i) => GOAL_CHIPS[i].goal === lead)
  return [...first, ...idx.filter((i) => !first.includes(i))]
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

/**
 * Where a named sport is actually played.
 *
 * The goal alone gets somebody "get better at my sport" and a list of
 * running tracks. By the time this screen appears they have already
 * SAID the sport, two screens earlier, and being asked about a track
 * when you told the app you climb is the app not listening.
 */
const SPORT_ACCESS: Record<string, Access[]> = {
  Climbing: [{ tags: ['pullup-bar'], label: 'A wall or board' }],
  Swimming: [{ tags: ['pool'], label: 'Pool' }],
  Rowing: [{ tags: ['machine'], label: 'A rowing machine' }],
  Cycling: [{ tags: ['bike'], label: 'A bike' }],
  Basketball: [{ tags: ['court'], label: 'Hoop or court' }],
  Netball: [{ tags: ['court'], label: 'A court' }],
  Volleyball: [{ tags: ['court'], label: 'A court' }],
  Tennis: [{ tags: ['court'], label: 'A court' }],
  Soccer: [{ tags: ['open-space'], label: 'A pitch or open grass' }],
  Football: [{ tags: ['open-space'], label: 'A field' }],
  Rugby: [{ tags: ['open-space'], label: 'A pitch' }],
  Lacrosse: [{ tags: ['open-space'], label: 'A field' }],
  Cricket: [{ tags: ['open-space'], label: 'A pitch or nets' }],
  'Baseball / softball': [{ tags: ['open-space'], label: 'A field or cage' }],
  'Track & field': [{ tags: ['track'], label: 'Running track' }],
  Running: [{ tags: ['trail'], label: 'Trails or paths' }],
  Hockey: [{ tags: ['open-space'], label: 'A rink or pitch' }],
  Skating: [{ tags: ['open-space'], label: 'A rink or park' }],
  'Snowboard / ski': [{ tags: ['hill-stairs'], label: 'A hill or stairs' }],
  Gymnastics: [{ tags: ['pullup-bar'], label: 'Bars or rings' }],
  Dance: [{ tags: ['open-space'], label: 'Room to move' }],
  'Martial arts / boxing': [{ tags: ['open-space'], label: 'Mat or bag space' }],
  Wrestling: [{ tags: ['open-space'], label: 'A mat' }],
  Surfing: [{ tags: ['pool'], label: 'Water, or a pool' }],
  Golf: [{ tags: ['open-space'], label: 'A range or open grass' }],
}

/**
 * What to offer THIS person: the places their sport or goal needs, plus
 * kit if the room is bare.
 *
 * The sport goes first when they named one, because it is the more
 * specific thing they told us.
 */
export function accessFor(
  goal: Goal,
  profile: 'gym' | 'home-db' | 'minimal',
  answers: Record<string, string> = {},
): Access[] {
  const sport = SPORT_ACCESS[answers['sport'] ?? ''] ?? []
  const byGoal = GOAL_ACCESS[goal] ?? []
  const seen = new Set(sport.map((a) => a.label))
  const places = [...sport, ...byGoal.filter((a) => !seen.has(a.label))]
  // A full gym already has the treadmill and the space; asking again
  // reads as the app not remembering what it just asked.
  const dropIfGym = new Set(['treadmill', 'open-space', 'box', 'pullup-bar'])
  const filtered = profile === 'gym' ? places.filter((a) => !a.tags.some((t) => dropIfGym.has(t))) : places
  return profile === 'minimal' ? [...MINIMAL_EXTRAS, ...filtered] : filtered
}

/** Kept for the profile switcher, which needs every tag any profile can show. */
const ALL_PLACES = [...Object.values(GOAL_ACCESS).flat(), ...Object.values(SPORT_ACCESS).flat()]
export const ENV_EXTRAS: Record<'gym' | 'home-db' | 'minimal', Access[]> = {
  gym: ALL_PLACES,
  'home-db': ALL_PLACES,
  minimal: [...MINIMAL_EXTRAS, ...ALL_PLACES],
}

export const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
