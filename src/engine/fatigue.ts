import type { AppData, FatigueNote, FatigueReason, ISODate, SessionLog } from '../types'
import type { MuscleRegion } from '../plan/muscleRegions'
import { musclesFor } from '../plan/muscles'
import { getExercise } from '../plan/exercises'
import { wordList } from '../plan/words'
import { daysBetween } from './calendar'
import { loadProvedWrong } from './shortfall'

// ============================================================
// What "I can't finish this" means, and what to do about it.
//
// The failure this exists to catch: the button said "Can't
// finish", asked nothing, and did nothing. Every reason a set
// dies got the same response, which is the same as having no
// response. But the four reasons are not variations on one
// problem, they are four different problems:
//
//   fried  the muscle is done, the body is not. Less load, same
//          movement, finish the set.
//   form   the reps are still there but they are ugly. The
//          exercise is over; grinding out bad reps is how people
//          get hurt for no stimulus.
//   pain   sharp or wrong, not the burn. Out of the movement
//          entirely, and never a "push through" option.
//   empty  the whole system, not one muscle. This is about the
//          rest of the session, not this exercise.
//
// REGIONS. A note carries the movement's PRIMARY regions, copied
// in rather than looked up later, so a note written today still
// means what it meant if the catalog is edited tomorrow. Primary
// only: an assisting muscle giving out is a different event from
// the target muscle giving out, and treating them the same is
// how "your triceps are cooked" ends up cancelling a leg day.
//
// This never runs inside resolveDay. The plan is golden-locked;
// this reads what happened and suggests, and every suggestion
// reaches the athlete as something to tap, never as something
// already done to them.
// ============================================================

/** The middle of the 10-15% band coaches use for a back-off set. */
const DROP_FRACTION = 0.875

/** How far back a note still counts toward a suggestion. */
export const RECENT_DAYS = 21

/** Two of the same complaint is a pattern; one is a bad day. */
export const PATTERN_COUNT = 2

/** A region complained about this many times is a volume problem, not an exercise problem. */
export const REGION_WATCH_COUNT = 3

/** The primary regions of a movement, which is what a fatigue note records. */
export function regionsFor(exerciseId: string): MuscleRegion[] {
  return musclesFor(exerciseId).primary
}

/**
 * The load to offer after a set dies: 10-15% off, on the 5 lb
 * granularity the steppers actually use.
 *
 * The clamp matters more than the fraction. Rounding alone can
 * land back on the weight you started from (17.5 rounds to 20),
 * and an "ease off" button that changes nothing is worse than no
 * button. So the result is always at least one 5 lb step lower,
 * which on light dumbbells is a bigger percentage than the band
 * asks for. That is the cost of 5 lb plates, not a bug.
 */
export function dropTo(weightLb: number, fraction = DROP_FRACTION): number {
  if (!Number.isFinite(weightLb) || weightLb <= 0) return 0
  const rounded = Math.round((weightLb * fraction) / 5) * 5
  return Math.max(0, Math.min(rounded, weightLb - 5))
}

/**
 * The load for a day flagged light. Same mechanic as the back-off
 * above, and deliberately the same function: two ways to say "take
 * it down a notch" would drift apart, and both have to guarantee
 * the number on screen actually moved.
 */
export const LIGHT_DAY_FRACTION = 0.85
export const lightLoad = (weightLb: number) => dropTo(weightLb, LIGHT_DAY_FRACTION)

export interface AheadHit {
  exIdx: number
  exerciseId: string
  /** Which primary regions it shares with the movement that just died. */
  shared: MuscleRegion[]
}

/**
 * What is still ahead today that leans on the same muscle.
 *
 * This is what makes "the rest of this session" a concrete list
 * instead of a feeling. If the quads just gave out and three of
 * the four remaining movements are quad-primary, the honest
 * thing to say is that the day is over, not "have a rest".
 */
export function sameGroupAhead(session: SessionLog, exIdx: number): AheadHit[] {
  const here = session.exercises[exIdx]
  if (!here) return []
  const mine = new Set(regionsFor(here.exerciseId))
  if (mine.size === 0) return []

  const out: AheadHit[] = []
  for (let i = exIdx + 1; i < session.exercises.length; i++) {
    const ex = session.exercises[i]
    if (ex.skipped) continue
    const shared = regionsFor(ex.exerciseId).filter((r) => mine.has(r))
    if (shared.length) out.push({ exIdx: i, exerciseId: ex.exerciseId, shared })
  }
  return out
}

export type SuggestionKind = 'swap' | 'start-lighter' | 'watch-region'

export interface FatigueSuggestion {
  kind: SuggestionKind
  /** Present for exercise-level suggestions. */
  exerciseId?: string
  regions: MuscleRegion[]
  /** How many notes back this up. */
  count: number
  /** The evidence, in a sentence. An unexplained change reads as a bug. */
  because: string
}

function notesInWindow(data: AppData, today: ISODate): FatigueNote[] {
  const out: FatigueNote[] = []
  for (const s of Object.values(data.sessions)) {
    const age = daysBetween(s.date, today)
    if (age < 0 || age > RECENT_DAYS) continue
    for (const n of s.fatigue ?? []) out.push(n)
  }
  return out
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/**
 * What to offer at the START of the next session, from what the
 * last few weeks actually said. Ordered most serious first:
 * pain outranks fatigue, and an exercise problem outranks a
 * whole-region volume problem, because it is the cheaper fix.
 */
/** Sessions a movement must come up short in before the load is questioned. */
export const SHORT_SESSIONS_TO_ACT = 3

/** Clean sessions in a row that put a flagged movement back to full prescription. */
export const CLEAN_SESSIONS_TO_UNFLAG = 2

/**
 * Which movements are currently flagged as failing, and how many short
 * sessions stand behind each flag.
 *
 * Raising and clearing are deliberately asymmetric. The flag goes up on
 * SHORT_SESSIONS_TO_ACT short sessions inside a RECENT_DAYS window, and
 * comes down only after CLEAN_SESSIONS_TO_UNFLAG clean sessions in a
 * row on that movement. Without the hysteresis the flag dropped the
 * moment a shortfall aged out of the window, so a movement still dying
 * every other week flickered between softened and full prescription
 * with nothing about the athlete having changed. Coming off a flag is
 * something the athlete earns by finishing the work, not something the
 * calendar hands back.
 */
export const EXPOSURES_BEFORE_STALLED = 6

/**
 * What a stalled movement is told, in one place.
 *
 * Said on the suggestion AND on the day's note, and it was written out
 * twice before this existed. Two copies of a sentence drift, and a coach
 * that says almost the same thing in two places reads as two coaches.
 */
const STALLED_LINE = `${EXPOSURES_BEFORE_STALLED} sessions lighter and it has not come back. Reps restart at the bottom of the range.`

interface FlagState {
  /** Short sessions standing behind the flag. */
  shorts: number
  /** Sessions of this movement since the flag went up. */
  exposures: number
  /**
   * Flagged, and the lighter prescription has not brought it back.
   *
   * R3 s9.2: if two clean sessions never arrive within six exposures,
   * softening is not working and the answer is rung 3, back off and
   * re-climb. Without this a flagged movement sits softened forever,
   * silently, and the app never admits the thing it tried did not work.
   */
  stalled: boolean
}

function flagStates(data: AppData, today: ISODate): Map<string, FlagState> {
  interface Walk {
    flagged: boolean
    cleanRun: number
    shorts: ISODate[]
    sinceFlag: number
  }
  const walks = new Map<string, Walk>()
  const sessions = Object.values(data.sessions)
    .filter((s) => s.date < today && s.status !== 'skipped')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  for (const s of sessions) {
    for (const log of s.exercises) {
      // A day the movement was not actually worked says nothing either way.
      if (log.skipped || !log.sets.some((set) => set.done)) continue
      // The SAME test the in-session drop acts on, not a second copy of
      // half of it. This used to count only a two-rep shortfall, so a
      // movement the app took weight off for because the athlete emptied
      // the tank and finished one down never counted towards the flag.
      // The drop happened every session and the next prescription never
      // heard about it. R3 s9.2 calls this escalation "already exists";
      // it did not, for that half of the evidence.
      const short = loadProvedWrong(log)
      let w = walks.get(log.exerciseId)
      if (!w) walks.set(log.exerciseId, (w = { flagged: false, cleanRun: 0, shorts: [], sinceFlag: 0 }))
      const wasFlagged = w.flagged
      if (short) {
        w.cleanRun = 0
        w.shorts.push(s.date)
        w.shorts = w.shorts.filter((d) => daysBetween(d, s.date) <= RECENT_DAYS)
        if (w.shorts.length >= SHORT_SESSIONS_TO_ACT) w.flagged = true
      } else {
        w.cleanRun++
        if (w.flagged && w.cleanRun >= CLEAN_SESSIONS_TO_UNFLAG) {
          w.flagged = false
          // Forgiven means forgiven: re-raising takes fresh evidence,
          // not two of the old shortfalls plus one bad day.
          w.shorts = []
        }
      }
      // The session that RAISES the flag is exposure zero, not one. The
      // six are the chances the softened prescription gets to work, and
      // the day it was written is not one of them.
      w.sinceFlag = w.flagged ? (wasFlagged ? w.sinceFlag + 1 : 0) : 0
    }
  }
  const out = new Map<string, FlagState>()
  for (const [id, w] of walks) {
    if (!w.flagged) continue
    out.set(id, {
      shorts: Math.max(w.shorts.length, 1),
      exposures: w.sinceFlag,
      stalled: w.sinceFlag >= EXPOSURES_BEFORE_STALLED,
    })
  }
  return out
}

/** Movements the lighter prescription has not rescued. */
export function stalledLifts(data: AppData, today: ISODate): Set<string> {
  const out = new Set<string>()
  for (const [id, st] of flagStates(data, today)) if (st.stalled) out.add(id)
  return out
}

export function nextSessionSuggestions(data: AppData, today: ISODate): FatigueSuggestion[] {
  const notes = notesInWindow(data, today)
  const shortfalls = flagStates(data, today)
  if (notes.length === 0 && shortfalls.size === 0) return []

  const byExercise = new Map<string, FatigueNote[]>()
  for (const n of notes) {
    const list = byExercise.get(n.exerciseId)
    if (list) list.push(n)
    else byExercise.set(n.exerciseId, [n])
  }

  const out: FatigueSuggestion[] = []
  const spokenFor = new Set<string>()

  // 1. Pain, repeated. Stop offering the movement.
  for (const [exerciseId, list] of byExercise) {
    const hurt = list.filter((n) => n.reason === 'pain')
    if (hurt.length >= PATTERN_COUNT) {
      spokenFor.add(exerciseId)
      out.push({
        kind: 'swap',
        exerciseId,
        regions: regionsFor(exerciseId),
        count: hurt.length,
        because: `This hurt ${hurt.length} times in the last ${RECENT_DAYS} days.`,
      })
    }
  }

  // 2. The muscle keeps dying on the same movement. Start lower.
  for (const [exerciseId, list] of byExercise) {
    if (spokenFor.has(exerciseId)) continue
    const gaveOut = list.filter((n) => n.reason === 'fried' || n.reason === 'form')
    if (gaveOut.length >= PATTERN_COUNT) {
      spokenFor.add(exerciseId)
      out.push({
        kind: 'start-lighter',
        exerciseId,
        regions: regionsFor(exerciseId),
        count: gaveOut.length,
        because: `You ran out on this ${gaveOut.length} times in the last ${RECENT_DAYS} days.`,
      })
    }
  }

  // 2b. The same story told by the log rather than by a tap.
  //
  //     Sections 1 and 2 only ever hear from the can't-finish sheet, so
  //     the only athlete this engine learned from was one who stopped
  //     mid-set and answered a question. Somebody who quietly grinds out
  //     five of the eight, week after week, was invisible to it: the
  //     shortfall reached the load engine inside the session and then
  //     went nowhere.
  //
  //     Sets that came up short are the same evidence, already on disk.
  //     Once flagged, the flag holds until two clean sessions in a row
  //     clear it (flagStates above), so the count here can be smaller
  //     than the one that raised it.
  for (const [exerciseId, state] of shortfalls) {
    if (spokenFor.has(exerciseId)) continue
    spokenFor.add(exerciseId)
    const count = state.shorts
    out.push({
      kind: 'start-lighter',
      exerciseId,
      regions: regionsFor(exerciseId),
      count,
      // Six exposures of a lighter weight and it still has not come back.
      // Saying "two clean sessions puts it back to normal" for a seventh
      // time is the app repeating advice it has already watched fail, so
      // it says what it is actually doing instead. R3 s9.2, rung 3.
      because: state.stalled
        ? STALLED_LINE
        : `You came up short on this in ${count} recent ${plural(count, 'session', 'sessions')}. Two clean sessions in a row puts it back to normal.`,
    })
  }

  // 3. A whole region keeps showing up across DIFFERENT movements.
  // One exercise failing is an exercise problem; the same muscle
  // failing on three of them is too much work on that muscle.
  const regionCount = new Map<MuscleRegion, Set<string>>()
  for (const n of notes) {
    if (n.reason === 'empty') continue // whole-body, names no muscle
    for (const r of n.regions as MuscleRegion[]) {
      const seen = regionCount.get(r)
      if (seen) seen.add(n.exerciseId)
      else regionCount.set(r, new Set([n.exerciseId]))
    }
  }
  for (const [region, exercises] of regionCount) {
    if (exercises.size < REGION_WATCH_COUNT) continue
    out.push({
      kind: 'watch-region',
      regions: [region],
      count: exercises.size,
      because: `${exercises.size} different ${plural(exercises.size, 'movement', 'movements')} on this muscle ran out recently.`,
    })
  }

  return out
}

/** Reasons that mean "this exercise is over", as opposed to "less weight". */
export function endsTheExercise(reason: FatigueReason): boolean {
  return reason === 'form' || reason === 'pain'
}


/**
 * What today should say about the movements it has quietly made easier.
 *
 * The failing flag was the only automatic adjustment in this app that
 * never said why. It softens the load and, once a movement is stalled,
 * restarts its rep range, and the athlete saw a squat go from 10 at 100
 * to 8 at 90 with nothing on screen about it. FatigueSuggestion has
 * carried a `because` since it was written, whose own comment reads "the
 * evidence, in a sentence: an unexplained change reads as a bug", and
 * nothing ever rendered it: prescription.ts is the only caller and it
 * reads `kind` alone.
 *
 * Stalled movements get a line each, because that message is an
 * escalation and worth the room. The ordinary softening is collapsed
 * into one, because one note per movement is how a bad month turns the
 * top of the screen into a wall of apology.
 */
export function flagNotes(data: AppData, today: ISODate, present: Set<string>): string[] {
  const states = [...flagStates(data, today)].filter(([id]) => present.has(id))
  if (!states.length) return []
  const out: string[] = []
  for (const [id, st] of states) {
    if (!st.stalled) continue
    out.push(`${getExercise(id).name}: ${STALLED_LINE}`)
  }
  const easing = states.filter(([, st]) => !st.stalled).map(([id]) => getExercise(id).name)
  if (easing.length) {
    const many = easing.length > 1
    out.push(
      `${wordList(easing)} ${many ? 'open' : 'opens'} lighter today. Two clean sessions in a row and ${many ? 'each is' : 'it is'} back to normal.`,
    )
  }
  return out
}
