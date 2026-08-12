// ============================================================
// The trophy case, as data.
//
// Every entry here is something a person DID. Nothing in this
// file can be earned by opening the app, viewing a screen or
// tapping around, and nothing should ever be added that can.
// The hierarchy the whole thing hangs on:
//
//   Stats    what you have done
//   Streak   how consistently you show up
//   Badges   what you have accomplished
//   Trophies who you have beaten
//
// `pending` marks the ones whose data does not exist in the app
// yet (friends, groups, challenges). They are listed so the case
// shows the shape of the thing, and they read as locked rather
// than as missing.
// ============================================================

export type AchievementCategory =
  | 'streak'
  | 'clock'
  | 'consistency'
  | 'progression'
  | 'strength'
  | 'cardio'
  | 'programming'
  | 'feat'
  | 'social'
  | 'competition'
  | 'goal'

export interface CategoryInfo {
  label: string
  icon: string
  blurb: string
}

export const CATEGORY_INFO: Record<AchievementCategory, CategoryInfo> = {
  streak: { label: 'Streaks', icon: '🔥', blurb: 'Showing up, over and over.' },
  clock: { label: 'Clock', icon: '⏰', blurb: 'When you train.' },
  consistency: { label: 'Consistency', icon: '📅', blurb: 'The plan, actually followed.' },
  progression: { label: 'Progression', icon: '📈', blurb: 'Getting better, measurably.' },
  strength: { label: 'Strength', icon: '🏋️', blurb: 'Personal records.' },
  cardio: { label: 'Cardio', icon: '🏃', blurb: 'The engine.' },
  programming: { label: 'Programming', icon: '🧠', blurb: 'Your routine, your rules.' },
  feat: { label: 'Feats', icon: '⚡', blurb: 'The unusual ones.' },
  social: { label: 'Social', icon: '🤝', blurb: 'Showing up for other people.' },
  competition: { label: 'Competition', icon: '🏆', blurb: 'Beating actual humans.' },
  goal: { label: 'Goals', icon: '🎯', blurb: 'The body you set out for.' },
}

export interface AchievementDef {
  id: string
  /**
   * Its own mark. A category icon repeated across eight badges makes
   * a grid of identical grey circles, which tells the reader nothing
   * about what any of them is. Placeholder for real artwork.
   */
  icon: string
  name: string
  /** One line on what it means. */
  blurb: string
  /** The exact bar, plain enough to check. */
  requirement: string
  category: AchievementCategory
  /** Trophies are won against people. Badges are earned against yourself. */
  kind: 'badge' | 'trophy'
  /** Can be earned more than once, and shows a ×count. */
  repeatable: boolean
  /** The number being counted to, when there is one. */
  goal?: number
  /** What one unit of `goal` is, for the progress line. */
  unit?: string
  /** Needs data the app does not collect yet. Shows as locked. */
  pending?: boolean
}

// ---------- Streaks ----------
// The flame on the profile is the LIVE number. These are the
// permanent record of milestones hit. Past a year the names stop:
// a second Inferno is worth more than a sillier word.

const STREAK: AchievementDef[] = [
  { id: 'heating-up', icon: '🔥', name: 'Heating Up', blurb: 'A month without a gap.', requirement: 'Reach a 30 day streak', category: 'streak', kind: 'badge', repeatable: false, goal: 30, unit: 'days' },
  { id: 'on-fire', icon: '🌋', name: 'On Fire', blurb: 'A quarter of a year, unbroken.', requirement: 'Reach a 90 day streak', category: 'streak', kind: 'badge', repeatable: false, goal: 90, unit: 'days' },
  { id: 'blazing', icon: '☄️', name: 'Blazing', blurb: 'Half a year. This is rare.', requirement: 'Reach a 180 day streak', category: 'streak', kind: 'badge', repeatable: false, goal: 180, unit: 'days' },
  { id: 'inferno', icon: '🐉', name: 'Inferno', blurb: 'A full year. Every extra year adds another.', requirement: 'Reach a 365 day streak', category: 'streak', kind: 'badge', repeatable: true, goal: 365, unit: 'days' },
]

// ---------- Clock ----------

const CLOCK: AchievementDef[] = [
  { id: 'early-riser', icon: '🌅', name: 'Early Riser', blurb: 'Up before the sun.', requirement: 'Finish 10 sessions before 6 AM', category: 'clock', kind: 'badge', repeatable: false, goal: 10, unit: 'sessions' },
  { id: 'dawn-patrol', icon: '🌄', name: 'Dawn Patrol', blurb: 'The 5 AM alarm is a habit now.', requirement: 'Finish 50 sessions before 6 AM', category: 'clock', kind: 'badge', repeatable: false, goal: 50, unit: 'sessions' },
  { id: 'night-shift', icon: '🌙', name: 'Night Shift', blurb: 'Training when the gym is empty.', requirement: 'Finish 10 sessions after 10 PM', category: 'clock', kind: 'badge', repeatable: false, goal: 10, unit: 'sessions' },
  { id: 'dark-knight', icon: '🦇', name: 'Dark Knight', blurb: 'The late shift is your shift.', requirement: 'Finish 50 sessions after 10 PM', category: 'clock', kind: 'badge', repeatable: false, goal: 50, unit: 'sessions' },
]

// ---------- Consistency ----------

const CONSISTENCY: AchievementDef[] = [
  { id: 'locked-in', icon: '🔒', name: 'Locked In', blurb: 'A clean week. Nothing missed.', requirement: 'Complete every planned session in one week', category: 'consistency', kind: 'badge', repeatable: true },
  { id: 'perfect-attendance', icon: '📅', name: 'Perfect Attendance', blurb: 'A whole month, nothing missed.', requirement: 'Complete every planned session in one month', category: 'consistency', kind: 'badge', repeatable: true },
  { id: 'clockwork', icon: '⚙️', name: 'Clockwork', blurb: 'Three perfect months.', requirement: 'Bank 3 perfect months', category: 'consistency', kind: 'badge', repeatable: false, goal: 3, unit: 'months' },
  { id: 'machine', icon: '🤖', name: 'Machine', blurb: 'Half a year of perfect months.', requirement: 'Bank 6 perfect months', category: 'consistency', kind: 'badge', repeatable: false, goal: 6, unit: 'months' },
]

// ---------- Progression ----------
// Not "who lifts the most". Who is going UP. A runner improving
// their pace and a lifter adding plates both count.

const PROGRESSION: AchievementDef[] = [
  { id: 'moving-up', icon: '📈', name: 'Moving Up', blurb: 'Two weeks of going up.', requirement: 'Improve across 2 straight weeks', category: 'progression', kind: 'badge', repeatable: false, goal: 2, unit: 'weeks' },
  { id: 'steady-climber', icon: '🧗', name: 'Steady Climber', blurb: 'A month of climbing.', requirement: 'Improve across a month', category: 'progression', kind: 'badge', repeatable: false, goal: 4, unit: 'weeks' },
  { id: 'leveling-up', icon: '🆙', name: 'Leveling Up', blurb: 'A quarter of steady gains.', requirement: 'Improve across 3 months', category: 'progression', kind: 'badge', repeatable: false, goal: 13, unit: 'weeks' },
  { id: 'different-animal', icon: '🐆', name: 'Different Animal', blurb: 'Six months up. Different person.', requirement: 'Improve across 6 months', category: 'progression', kind: 'badge', repeatable: false, goal: 26, unit: 'weeks' },
]

// ---------- Strength / PRs ----------

const STRENGTH: AchievementDef[] = [
  { id: 'new-heights', icon: '🏔️', name: 'New Heights', blurb: 'The first one.', requirement: 'Set your first personal record', category: 'strength', kind: 'badge', repeatable: false, goal: 1, unit: 'PRs' },
  { id: 'pr-machine', icon: '🏋️', name: 'PR Machine', blurb: 'Ten records deep.', requirement: 'Set 10 personal records', category: 'strength', kind: 'badge', repeatable: false, goal: 10, unit: 'PRs' },
  { id: 'record-breaker', icon: '💥', name: 'Record Breaker', blurb: 'Twenty five.', requirement: 'Set 25 personal records', category: 'strength', kind: 'badge', repeatable: false, goal: 25, unit: 'PRs' },
  { id: 'limit-breaker', icon: '🚀', name: 'Limit Breaker', blurb: 'Fifty records. The ceiling keeps moving.', requirement: 'Set 50 personal records', category: 'strength', kind: 'badge', repeatable: false, goal: 50, unit: 'PRs' },
  { id: 'hat-trick', icon: '🎩', name: 'Hat Trick', blurb: 'Three records in one session.', requirement: 'Set 3 PRs in a single workout', category: 'strength', kind: 'badge', repeatable: true },
  { id: 'career-day', icon: '🌟', name: 'Career Day', blurb: 'Everything went up at once.', requirement: 'Set 5 or more PRs in a single workout', category: 'strength', kind: 'badge', repeatable: true },
  { id: 'untouchable', icon: '👑', name: 'Untouchable', blurb: 'A number that stood for half a year, gone.', requirement: 'Break a PR that had stood 6 months', category: 'strength', kind: 'badge', repeatable: true },
  { id: 'clean-sweep', icon: '🧹', name: 'Clean Sweep', blurb: 'Every tracked lift up, same block.', requirement: 'PR every tracked lift within one training block', category: 'strength', kind: 'badge', repeatable: true },
]

// ---------- Cardio ----------

const CARDIO: AchievementDef[] = [
  { id: 'first-mile', icon: '👟', name: 'First Mile', blurb: 'It starts here.', requirement: 'Log your first tracked mile', category: 'cardio', kind: 'badge', repeatable: false, goal: 1, unit: 'miles' },
  { id: 'roadwork', icon: '🛣️', name: 'Roadwork', blurb: 'Ten sessions in the tank.', requirement: 'Log 10 cardio sessions', category: 'cardio', kind: 'badge', repeatable: false, goal: 10, unit: 'sessions' },
  { id: 'engine', icon: '🫀', name: 'Engine', blurb: 'Fifty. You have built something.', requirement: 'Log 50 cardio sessions', category: 'cardio', kind: 'badge', repeatable: false, goal: 50, unit: 'sessions' },
  { id: 'endless-tank', icon: '⛽', name: 'Endless Tank', blurb: 'A hundred sessions of engine work.', requirement: 'Log 100 cardio sessions', category: 'cardio', kind: 'badge', repeatable: false, goal: 100, unit: 'sessions' },
  { id: 'going-the-distance', icon: '🧭', name: 'Going the Distance', blurb: 'Your longest yet.', requirement: 'Set a distance record', category: 'cardio', kind: 'badge', repeatable: true },
  { id: 'fastest-yet', icon: '⚡', name: 'Fastest Yet', blurb: 'Your quickest yet.', requirement: 'Set a pace record', category: 'cardio', kind: 'badge', repeatable: true },
  { id: 'double-duty', icon: '🔁', name: 'Double Duty', blurb: 'Lifted and ran the same day.', requirement: 'Do a session and cardio on the same day', category: 'cardio', kind: 'badge', repeatable: true },
]

// ---------- Feats ----------

const FEATS: AchievementDef[] = [
  { id: 'iron-week', icon: '⛓️', name: 'Iron Week', blurb: 'Every session AND every mile.', requirement: 'Complete every planned session and every planned cardio in a week', category: 'feat', kind: 'badge', repeatable: true },
  { id: 'ghost', icon: '👻', name: 'Ghost', blurb: 'A month, no excuses. Not one.', requirement: 'Go 30 days without logging an excuse', category: 'feat', kind: 'badge', repeatable: true, goal: 30, unit: 'days' },
]

// ---------- Programming ----------
// Making a routine is not the achievement. Sticking to the one
// you made is.

const PROGRAMMING: AchievementDef[] = [
  { id: 'freestyler', icon: '✍️', name: 'Freestyler', blurb: 'You wrote your own.', requirement: 'Create or edit your own routine', category: 'programming', kind: 'badge', repeatable: false },
  { id: 'trendsetter', icon: '🎨', name: 'Trendsetter', blurb: 'Two weeks on your own programming.', requirement: 'Follow your own routine for 2 weeks', category: 'programming', kind: 'badge', repeatable: false, goal: 2, unit: 'weeks' },
  { id: 'self-made', icon: '🛠️', name: 'Self Made', blurb: 'Six weeks, all yours.', requirement: 'Follow your own routine for 6 weeks', category: 'programming', kind: 'badge', repeatable: false, goal: 6, unit: 'weeks' },
  { id: 'the-architect', icon: '📐', name: 'The Architect', blurb: 'A whole block, start to finish, your design.', requirement: 'Complete a full training block on a routine you built', category: 'programming', kind: 'badge', repeatable: true },
]

// ---------- Goals / body ----------
// Nothing here rewards speed for its own sake. Ozympic God is a
// joke about finishing early, not about crash dieting: it needs a
// finished, healthy-rate cut, ahead of the schedule you set.

const GOALS: AchievementDef[] = [
  { id: 'down-bad', icon: '📉', name: 'Down Bad', blurb: 'First five pounds down.', requirement: 'Lose 5 lb from your starting weight', category: 'goal', kind: 'badge', repeatable: false, goal: 5, unit: 'lb' },
  { id: 'shredder', icon: '🔪', name: 'Shredder', blurb: 'Ten down.', requirement: 'Lose 10 lb from your starting weight', category: 'goal', kind: 'badge', repeatable: false, goal: 10, unit: 'lb' },
  { id: 'growing-pains', icon: '🌱', name: 'Growing Pains', blurb: 'First five on.', requirement: 'Gain 5 lb on a mass goal', category: 'goal', kind: 'badge', repeatable: false, goal: 5, unit: 'lb' },
  { id: 'mass-builder', icon: '🧱', name: 'Mass Builder', blurb: 'Ten on, training held.', requirement: 'Gain 10 lb while keeping the sessions in', category: 'goal', kind: 'badge', repeatable: false, goal: 10, unit: 'lb' },
  { id: 'big-business', icon: '💼', name: 'Big Business', blurb: 'A real bulk, finished.', requirement: 'Complete a mass-gain goal', category: 'goal', kind: 'badge', repeatable: true },
  { id: 'bullseye', icon: '🎯', name: 'Bullseye', blurb: 'The number you named.', requirement: 'Reach your target weight', category: 'goal', kind: 'badge', repeatable: true },
  { id: 'transformation', icon: '🦋', name: 'Transformation', blurb: 'A full cut, bulk or recomp, done.', requirement: 'Complete a body-composition goal', category: 'goal', kind: 'badge', repeatable: true },
  { id: 'new-body-who-dis', icon: '🪞', name: 'New Body Who Dis', blurb: 'The long one. People notice.', requirement: 'Complete a major transformation over 6 months or more', category: 'goal', kind: 'badge', repeatable: false },
  { id: 'ozympic-god', icon: '💊', name: 'Ozympic God', blurb: 'Finished the cut way ahead of schedule, the honest way.', requirement: 'Finish a weight-loss goal well ahead of your own timeline, at a healthy rate throughout', category: 'goal', kind: 'badge', repeatable: false },
]

// ---------- Social ----------
// Needs friends and groups, which do not exist yet. Anti-farming
// rules belong with the implementation, not here: a compliment
// only counts once per friend per day.

const SOCIAL: AchievementDef[] = [
  { id: 'hype-man', icon: '📣', name: 'Hype Man', blurb: 'Ten real nudges sent.', requirement: 'Send 10 compliments or nudges', category: 'social', kind: 'badge', repeatable: false, goal: 10, unit: 'nudges', pending: true },
  { id: 'corner-man', icon: '🥊', name: 'Corner Man', blurb: 'Fifty. You are in their corner.', requirement: 'Send 50 compliments or nudges', category: 'social', kind: 'badge', repeatable: false, goal: 50, unit: 'nudges', pending: true },
  { id: 'challenger', icon: '🤜', name: 'Challenger', blurb: 'You called someone out.', requirement: 'Create your first friend challenge', category: 'social', kind: 'badge', repeatable: false, pending: true },
  { id: 'rivalry', icon: '⚔️', name: 'Rivalry', blurb: 'Same opponent, five times.', requirement: 'Compete against the same friend 5 times', category: 'social', kind: 'badge', repeatable: true, goal: 5, unit: 'matchups', pending: true },
  { id: 'everybody-eats', icon: '🍽️', name: 'Everybody Eats', blurb: 'You and three friends all finished.', requirement: 'Finish a challenge alongside 3 or more friends', category: 'social', kind: 'badge', repeatable: true, pending: true },
  { id: 'squad-goals', icon: '🫂', name: 'Squad Goals', blurb: 'Nobody in the group dropped it.', requirement: 'Every member of a group hits the weekly goal', category: 'social', kind: 'badge', repeatable: true, pending: true },
  { id: 'pack-leader', icon: '🐺', name: 'Pack Leader', blurb: 'You built a real group.', requirement: 'Run a group with 10 active members', category: 'social', kind: 'badge', repeatable: false, goal: 10, unit: 'members', pending: true },
  { id: 'cult-leader', icon: '🛐', name: 'Cult Leader', blurb: 'A hundred people. That is a movement.', requirement: 'Run a group with 100 active members', category: 'social', kind: 'badge', repeatable: false, goal: 100, unit: 'members', pending: true },
]

// ---------- Competition ----------
// Trophies, not badges. These are the only ones won against other
// people, which is exactly what makes them worth more.

const COMPETITION: AchievementDef[] = [
  { id: 'first-blood', icon: '🩸', name: 'First Blood', blurb: 'Your first win.', requirement: 'Win a challenge', category: 'competition', kind: 'trophy', repeatable: false, goal: 1, unit: 'wins', pending: true },
  { id: 'on-a-tear', icon: '🔱', name: 'On a Tear', blurb: 'Three wins.', requirement: 'Win 3 challenges', category: 'competition', kind: 'trophy', repeatable: false, goal: 3, unit: 'wins', pending: true },
  { id: 'unstoppable', icon: '🏆', name: 'Unstoppable', blurb: 'Ten. People are avoiding you.', requirement: 'Win 10 challenges', category: 'competition', kind: 'trophy', repeatable: false, goal: 10, unit: 'wins', pending: true },
  { id: 'group-champion', icon: '🥇', name: 'Champion', blurb: 'You won your club outright. Carries the group name.', requirement: 'Win an official competition inside a group, club or league', category: 'competition', kind: 'trophy', repeatable: true, pending: true },
]

export const ACHIEVEMENTS: AchievementDef[] = [
  ...STREAK,
  ...CLOCK,
  ...CONSISTENCY,
  ...PROGRESSION,
  ...STRENGTH,
  ...CARDIO,
  ...PROGRAMMING,
  ...FEATS,
  ...GOALS,
  ...SOCIAL,
  ...COMPETITION,
]

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)

/** The order categories appear in the trophy case. */
export const CATEGORY_ORDER: AchievementCategory[] = [
  'streak',
  'consistency',
  'strength',
  'cardio',
  'progression',
  'clock',
  'feat',
  'programming',
  'goal',
  'competition',
  'social',
]

// ---------- The flame ----------
// The live streak on a profile, which is a separate thing from the
// badges above: the badges are the permanent record, the flame is
// what is burning right now.

export interface FlameTier {
  /** Lowest streak that shows this flame. */
  from: number
  name: string
  /** Drives the size and speed of the animation. */
  level: 1 | 2 | 3 | 4 | 5
}

/** Under 7 days there is no flame at all. A streak has to mean something. */
export const FLAME_MIN = 7

export const FLAME_TIERS: FlameTier[] = [
  { from: 7, name: 'Lit', level: 1 },
  { from: 30, name: 'Heating Up', level: 2 },
  { from: 90, name: 'On Fire', level: 3 },
  { from: 180, name: 'Blazing', level: 4 },
  { from: 365, name: 'Inferno', level: 5 },
]

export function flameFor(streak: number): FlameTier | null {
  if (streak < FLAME_MIN) return null
  let out = FLAME_TIERS[0]
  for (const t of FLAME_TIERS) if (streak >= t.from) out = t
  return out
}
