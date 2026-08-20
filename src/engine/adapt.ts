import type { AppData, ISODate, ResolvedExercise } from '../types'
import type { EquipTag } from '../types'
import { addDaysISO, mondayOf } from './calendar'
import { loggedSessions } from './activityLog'
import { EXERCISE_EQUIP, canDo } from '../plan/equip'
import { MOVEMENT, sessionFatigue, substitutesFor, type Joint } from '../plan/movement'
import { blockedIds, limitedJoints } from '../prefsTypes'
import { wordList } from '../plan/words'
// The reading half. Re-exported because "what happened" and "so what" are
// one subject to everybody outside this pair, and moving a function should
// not move every import in the app.
import { persistentPainJoints, readSignals, twoConsecutiveBadNightsBefore, type Signal } from './signals'
export * from './signals'

// ============================================================
// What changed, and what should happen next because of it.
//
// The app already reacted to things ONE AT A TIME, each in its
// own place: a readiness answer downgrades today, two bad nights
// cut a third of the volume, a repeated pain note offers a swap
// next session, the volume cap trims a day that totals too much.
// Every one of those is good and none of them talks to the
// others, so the day after a week that genuinely went sideways
// looked exactly like the day after a perfect one.
//
// This is the layer that reads the whole recent picture and says
// what to do about it. The scenarios it exists for are ordinary:
//
//   missed Wednesday
//   played two hours of basketball on Thursday that nobody
//     planned
//   slept badly twice
//   hit a PR on Friday
//   shoulder started complaining on Saturday
//   away from the gym with dumbbells for a week
//
// None of those should require rebuilding a programme, and all
// of them change what the right next session is.
//
// TWO KINDS OF ANSWER, kept apart on purpose.
//
// An adjustment is AUTOMATIC when doing nothing would hand the
// athlete a session they physically cannot do, or should not: a
// barbell movement with no barbell in the room, or a movement
// loading a joint they have told us twice now is hurting. Making
// those a prompt is asking somebody to fix the app's homework
// mid-session.
//
// Everything else is a PROPOSAL. That is the house rule from
// engine/fatigue.ts and it is the right one: the athlete's own
// read of their body outranks an inference drawn from it, and a
// plan that quietly shrinks itself after one bad night teaches
// people the app is nervous rather than that it is paying
// attention.
//
// WHAT THIS DOES NOT DO: it never invents work. Nothing here
// makes a day harder than the programme called for. The one
// direction it will push upward is honouring a progression the
// athlete has already earned, which is the plan's own rule
// arriving on time rather than extra credit.
// ============================================================


// ---------------- Deciding what changes ----------------

/**
 * `add-recovery` used to sit in this union and nothing ever produced it.
 * It stayed out on the rewrite rather than being given a producer: the
 * evidence for prescribing recovery WORK — foam rolling, extra mobility,
 * a "recovery session" — as a response to fatigue is thin, while sleep
 * and food, which have the evidence, are not this engine's to adjust.
 * A kind the UI has to branch on and the engine never emits is a promise
 * in a type signature, and the honest version of it is fewer sets.
 *
 * `reduce-load` replaced it, for the one case that genuinely needed a
 * fourth kind: a flagged joint the movement pattern cannot spare.
 */
export type AdjustmentKind = 'substitute' | 'reduce-volume' | 'hold-load' | 'reduce-load'

export interface Adjustment {
  /** Every movement this applies to, when it is more than the named one. */
  allIds?: string[]
  kind: AdjustmentKind
  /** Automatic changes are already applied; proposals wait for a tap. */
  automatic: boolean
  exerciseId?: string
  toExerciseId?: string
  /** Sets to remove, for reduce-volume. */
  sets?: number
  /** The reason, in the athlete's terms. An unexplained change reads as a bug. */
  because: string
}

export interface AdaptContext {
  owned: Set<EquipTag>
  signals: Signal[]
  /**
   * The resolver has ALREADY cut a third off today for two consecutive
   * bad nights. Offering another set off on top would be two reductions
   * for one night's sleep, which is how "take it easy" turns into half a
   * session nobody agreed to.
   */
  alreadyCutForSleep?: boolean
  /** Movements the athlete has said they will not do. */
  blocked?: Set<string>
  /**
   * Joints from stated limitations, which do NOT expire.
   *
   * The pain signals beside them are inferred from a rolling 14-day
   * window, so the only way to keep the plan off a bad shoulder was to
   * keep hurting it at least once a fortnight. A limitation somebody
   * typed in stays until they take it out.
   */
  limited?: Joint[]
  /**
   * Joints still complaining after the two weeks the app promised them.
   *
   * These stop being routed around. A substitute is chosen to spare the
   * joint, so when the joint hurts anyway the swap was not the fix, and
   * swapping again is the app repeating an answer that has already been
   * tried. R3 s9.2 sends this to the reduce-load path and to a human.
   */
  persistentPain?: Joint[]
}

const can = (owned: Set<EquipTag>) => (id: string) => canDo(id, owned)

/** "shoulder", "shoulder and elbow", "shoulder, elbow and wrist". */
const jointList = (joints: Joint[]) => wordList(joints.map((j) => j.replace('-', ' ')))

/**
 * Everything that should change about a session, given what has actually
 * been happening. Pure: it decides, it does not apply.
 */
/**
 * Everything planAdjustments needs to judge a day, built in one place.
 *
 * There are two callers and they are two halves of one call: this file
 * takes the automatic adjustments, AdaptProposals.tsx takes the rest and
 * offers them. The screen was passing two of the five fields.
 *
 * That is not a cosmetic gap. `alreadyCutForSleep` is a guard, so leaving
 * it undefined reads as "no, nothing has been cut", and on a day the
 * resolver had ALREADY taken a third off for two bad nights the screen
 * went on to offer a set off every lift on top of it. Two reductions for
 * one night's sleep, which is the exact outcome the field exists to stop.
 * `blocked` and `limited` failed quieter: the offers ignored movements the
 * athlete has said they will not do and joints they have told us about.
 *
 * One builder, so the halves cannot drift again. adaptContext.test.ts
 * pins that every call site uses it.
 */
export function adaptContext(data: AppData, dateISO: ISODate, equipment: EquipTag[]): AdaptContext {
  return {
    owned: new Set<EquipTag>(['none', ...equipment]),
    signals: readSignals(data, dateISO),
    alreadyCutForSleep: twoConsecutiveBadNightsBefore(data, dateISO),
    blocked: blockedIds(data.prefs),
    limited: limitedJoints(data.prefs) as Joint[],
    persistentPain: persistentPainJoints(data, dateISO),
  }
}

export function planAdjustments(
  exercises: ResolvedExercise[],
  ctx: AdaptContext,
): Adjustment[] {
  const out: Adjustment[] = []
  const painJoints = ctx.signals.filter((s) => s.kind === 'joint-pain').flatMap((s) => s.joints ?? [])
  const avoid = [...new Set([...painJoints, ...(ctx.limited ?? [])])]
  /** Joints that have outlasted the two weeks, so swapping is done. */
  const stuck = new Set(ctx.persistentPain ?? [])
  /** Flagged joints that no substitute can spare, gathered so the athlete hears it once. */
  const unroutable = new Map<Joint, string[]>()

  for (const ex of exercises) {
    const meta = MOVEMENT[ex.exerciseId]

    // 0. AUTOMATIC: they have told us they will not do this one. Asking
    //    again is the app forgetting, and being asked to re-answer a
    //    question you already answered is how software stops feeling like
    //    it is on your side.
    if (ctx.blocked?.has(ex.exerciseId)) {
      const sub = substitutesFor(ex.exerciseId, { can: can(ctx.owned), avoid })[0]
      if (sub) {
        out.push({
          kind: 'substitute',
          automatic: true,
          exerciseId: ex.exerciseId,
          toExerciseId: sub,
          because: 'You told me to keep this one out, so this covers the same pattern instead.',
        })
      }
      continue
    }

    // 1. AUTOMATIC: the equipment is not in the room. A session the
    //    athlete cannot physically perform is not a prompt, it is a bug.
    if (!canDo(ex.exerciseId, ctx.owned)) {
      const sub = substitutesFor(ex.exerciseId, { can: can(ctx.owned) })[0]
      if (sub) {
        out.push({
          kind: 'substitute',
          automatic: true,
          exerciseId: ex.exerciseId,
          toExerciseId: sub,
          because: `No ${missingWord(ex.exerciseId, ctx.owned)} today, so this is the same movement with what you have.`,
        })
      }
      continue
    }

    // 2. AUTOMATIC: it loads a joint that has been flagged more than once.
    //    Routing around pain should not cost a tap, and "train through it"
    //    is not a suggestion this app is willing to make.
    if (avoid.length && meta && meta.stress.some((j) => avoid.includes(j))) {
      const joint = meta.stress.find((j) => avoid.includes(j))!
      // A joint that has kept complaining through two weeks of being
      // routed around is not a routing problem. Every substitute here
      // was already picked to spare it, so offering another one is the
      // app trying the same answer a third time. Send it down the
      // unroutable path instead, which drops the load and says the thing
      // this app has been promising to say.
      const sub = stuck.has(joint)
        ? undefined
        : substitutesFor(ex.exerciseId, { can: can(ctx.owned), avoid })[0]
      if (sub) {
        out.push({
          kind: 'substitute',
          automatic: true,
          exerciseId: ex.exerciseId,
          toExerciseId: sub,
          because: `Your ${joint.replace('-', ' ')} has been complaining, so this trains the same pattern without loading it.`,
        })
      } else {
        unroutable.set(joint, [...(unroutable.get(joint) ?? []), ex.exerciseId])
      }
    }
  }

  // 2b. Some joints cannot be routed around, and the plan used to go
  //     quiet about exactly those.
  //
  //     There is no way to press overhead without loading a shoulder —
  //     the pattern IS the stress — so substitutesFor correctly returns
  //     nothing, and the old code's `if (sub)` then dropped the whole
  //     case on the floor. A shoulder flagged three times kept getting
  //     prescribed a standing press with no comment at all, which reads
  //     as the app not having noticed. It had noticed; it had nothing to
  //     say. (Not a rare corner: a full-gym athlete has eight of these
  //     for the shoulder alone, a bodyweight athlete six for the knee.)
  //
  //     What it says now is what a physio would: keep training it, drop
  //     the load, stop at the first sharp one, and put a clock on it.
  //     Pain-guided loading beats rest for tendon and joint complaints;
  //     "train through it" and "stop training" are both wrong, and the
  //     honest part is admitting an app cannot tell which one this is
  //     after two weeks.
  const stated = new Set(ctx.limited ?? [])

  // Every stuck joint in ONE card. A pressing movement stresses the
  // shoulder and the elbow, so one pain note makes both persistent and a
  // per-joint loop handed the athlete the same four-sentence paragraph
  // twice with one word changed. Caught by screenshot in the slice 5
  // review; the unroutable map exists to make somebody hear a thing once
  // and this was the same rule broken one level up.
  const alsoStuck = [...unroutable].filter(([j]) => stuck.has(j) && !stated.has(j))
  if (alsoStuck.length) {
    const joints = jointList(alsoStuck.map(([j]) => j))
    const ids = [...new Set(alsoStuck.flatMap(([, list]) => list))]
    const many = ids.length > 1
    out.push({
      kind: 'reduce-load',
      automatic: false,
      exerciseId: ids[0],
      allIds: ids,
      because: `Your ${joints} ${alsoStuck.length > 1 ? 'have' : 'has'} been complaining for over two weeks now. I said that is where an app runs out of road, and it is: swapping the movement did not settle it and swapping it again will not either. Keep ${many ? 'them' : 'it'} in at a lighter weight and stop at the first sharp rep. Two weeks of this is a physio question, not an app one.`,
    })
  }

  for (const [joint, ids] of unroutable) {
    if (stuck.has(joint) && !stated.has(joint)) continue
    const j = joint.replace('-', ' ')
    // Told, or inferred? The app should act on the first and offer on the
    // second, and it should not use the same sentence for both.
    //
    // A limitation the athlete typed in is not a pattern that "keeps
    // getting flagged": nothing was flagged, they said it once and expect
    // it remembered. Routing stated limitations through the inferred-pain
    // path meant somebody eighteen months past a knee replacement was
    // handed full-weight split squats and a suggestion to consider taking
    // some off.
    if (stated.has(joint)) {
      out.push({
        kind: 'reduce-load',
        automatic: true,
        exerciseId: ids[0],
        allIds: ids,
        because: `You told me about your ${j}, and every version of ${ids.length > 1 ? 'these movements' : 'this movement'} loads it. There is no swap that trains the pattern and spares the joint, so ${ids.length > 1 ? 'they are' : 'it is'} in at a lighter weight rather than out. Stop the set at the first sharp one rather than at the rep count.`,
      })
      continue
    }
    out.push({
      kind: 'reduce-load',
      automatic: false,
      exerciseId: ids[0],
      because: `Your ${j} keeps getting flagged, and every version of ${ids.length > 1 ? 'these movements' : 'this movement'} loads it. There is no swap that trains the pattern and spares the joint. So keep ${ids.length > 1 ? 'them' : 'it'} in and take the weight down instead: roughly a third off, stop the set at the first sharp one rather than at the rep count. If it is still there in two weeks, that is a question for a physio and not for an app.`,
    })
  }

  // 3-4. PROPOSALS, and WHICH proposal is the whole point.
  //
  // Sleep loss and a training gap both mean "something is off", and the
  // correct response to each is close to the OPPOSITE of the other. Being
  // vague about that is how an app ends up making somebody take a day off
  // for no reason.
  //
  // SHORT SLEEP: maximal strength on a single effort is largely
  // preserved. What degrades is REPEATED effort, time to exhaustion and
  // reaction time, while perceived exertion goes up — the same set feels
  // harder than it is. So the answer is fewer SETS, at the same weight,
  // and definitely not a day off. Somebody who sleeps badly twice a week
  // and is told to skip is somebody who trains half as much as they
  // should for the rest of their life.
  //
  // A TRAINING GAP is the mirror image. Nothing is fatigued; if anything
  // there is slight detraining, so the VOLUME is wanted and it is the
  // LOAD that should not pick up where the plan expected. Cutting sets
  // here would be the exactly wrong medicine.
  //
  // UNPLANNED LOAD sits with sleep: the systemic cost is already banked,
  // so the sets come off. ACCUMULATED FATIGUE, three heavy sessions in a
  // week, gets both, because it is the one case where the load itself is
  // the evidence.
  const shortSleep = ctx.signals.find((s) => s.kind === 'poor-sleep')
  const wornDown = ctx.signals.find((s) => s.kind === 'accumulated-fatigue')
  const extra = ctx.signals.find((s) => s.kind === 'extra-load')
  const missed = ctx.signals.find((s) => s.kind === 'missed')

  const cutReasons = [shortSleep, wornDown, extra].filter(Boolean)
  if (cutReasons.length > 0 && !ctx.alreadyCutForSleep) {
    out.push({
      kind: 'reduce-volume',
      automatic: false,
      sets: 1,
      because: `${cutReasons.map((s) => s!.detail).join(' ')} A set off each lift, same weight on the bar. Short sleep costs you repeated efforts long before it costs you strength, so the sets are what should give.`,
    })
  }

  // Holding the load is a SECOND question, asked at most once. Cutting
  // sets and not chasing a number are different decisions, so both can be
  // on screen; two versions of the same decision cannot.
  const holdReason =
    wornDown || (shortSleep && extra)
      ? 'Also worth not chasing a new number today. Same weight as last time is a session that still counts; a failed PR on a bad week is one that does not.'
      : missed
        ? `${missed.detail} Coming back, the volume is wanted, you are undertrained rather than overtrained, but the LOAD should not pick up where the plan expected you to be. One session at the old weight, then climb.`
        : null
  if (holdReason) out.push({ kind: 'hold-load', automatic: false, because: holdReason })

  return out
}

/** Name the thing that is actually missing, not "equipment". */
const EQUIP_WORD: Partial<Record<EquipTag, string>> = {
  barbell: 'barbell',
  dumbbell: 'dumbbells',
  machine: 'machine',
  'pullup-bar': 'pull-up bar',
  bench: 'bench',
  'incline-bench': 'incline bench',
  rack: 'rack',
  band: 'band',
  box: 'box',
  kettlebell: 'kettlebell',
  'trap-bar': 'trap bar',
  sled: 'sled',
  treadmill: 'treadmill',
  plate: 'plates',
  partner: 'partner',
}

function missingWord(id: string, owned: Set<EquipTag>): string {
  const missing = (EXERCISE_EQUIP[id] ?? []).filter((t) => t !== 'none' && !owned.has(t))
  const named = missing.map((t) => EQUIP_WORD[t]).filter(Boolean) as string[]
  return named.length ? named.join(' or ') : 'gear'
}

/**
 * Apply the automatic adjustments, leaving the proposals alone.
 *
 * Substitutions keep the prescription: the replacement fills the same
 * slot for the same sets and reps, because it was chosen to do the same
 * job. Changing the dose at the same time as the movement would make the
 * next session's progression read off a number that means something
 * different.
 */
export function applyAutomatic(
  exercises: ResolvedExercise[],
  adjustments: Adjustment[],
  nameOf: (id: string) => { name: string; kind: ResolvedExercise['kind']; restSec: number },
): ResolvedExercise[] {
  const swaps = new Map(
    adjustments
      .filter((a) => a.automatic && a.kind === 'substitute' && a.exerciseId && a.toExerciseId)
      .map((a) => [a.exerciseId!, a.toExerciseId!]),
  )
  // A movement that cannot be routed around a stated limitation stays in
  // the day and comes down in weight. lightMode is the existing way to say
  // that, and prefillFor already honours it end to end.
  const lighten = new Set(
    adjustments
      .filter((a) => a.automatic && a.kind === 'reduce-load')
      .flatMap((a) => a.allIds ?? (a.exerciseId ? [a.exerciseId] : [])),
  )
  if (swaps.size === 0 && lighten.size === 0) return exercises
  return exercises.map((e) => {
    if (lighten.has(e.exerciseId)) return { ...e, lightMode: true }
    const to = swaps.get(e.exerciseId)
    if (!to) return e
    const def = nameOf(to)
    return { ...e, exerciseId: to, name: def.name, kind: def.kind, restSec: def.restSec, swappedFrom: e.exerciseId }
  })
}

/**
 * How much this week has actually taken, counting the sport nobody
 * programmed. The number the plan thinks it prescribed is not the number
 * the body received, and only one of those matters.
 */
export function weekLoad(data: AppData, today: ISODate): { planned: number; unplanned: number } {
  const monday = mondayOf(today)
  let planned = 0
  for (let i = 0; i < 7; i++) {
    const s = data.sessions[addDaysISO(monday, i)]
    if (!s || s.status === 'skipped') continue
    planned += sessionFatigue(
      s.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets.filter((x) => x.done).length })),
    )
  }
  let unplanned = 0
  for (const s of loggedSessions(data, { from: monday, to: addDaysISO(monday, 6) })) {
    // A rough equivalence: an hour of hard sport costs about what a
    // moderate lifting session costs. Deliberately coarse, because the
    // decision it feeds is "is this week already full", not a calorie.
    unplanned += Math.round(s.minutes / 15)
  }
  return { planned, unplanned }
}


// ---------------- The one call the resolver makes ----------------

/**
 * Apply everything automatic to a session, and hand back the line that
 * explains it.
 *
 * This lives here rather than in resolveDay so the resolver stays a
 * pipeline of named transforms instead of growing a branch that knows
 * about equipment, joints and signal windows. The resolver's job is
 * ORDER; this file's job is what adaptation means.
 */
export function adaptSession(
  exercises: ResolvedExercise[],
  data: AppData,
  dateISO: ISODate,
  equipment: EquipTag[],
  nameOf: (id: string) => { name: string; kind: ResolvedExercise['kind']; restSec: number },
): { exercises: ResolvedExercise[]; notes: string[] } {
  const notes: string[] = []
  let out = exercises

  const automatic = planAdjustments(exercises, adaptContext(data, dateISO, equipment)).filter(
    (a) => a.automatic,
  )
  if (automatic.length > 0) {
    out = applyAutomatic(out, automatic, nameOf)
    notes.push(
      automatic.length === 1
        ? automatic[0].because
        : `${automatic.length} movements swapped today. ${automatic[0].because}`,
    )
  }

  // A proposal the athlete actually took. Only the SETS come off here.
  // Holding the load is the prescription's business rather than the day's
  // shape, and running both through one switch is how "take it easy"
  // turned into three different reductions stacking on one session.
  if ((data.adapt[dateISO] ?? []).includes('reduce-volume')) {
    out = out.map((e) =>
      KIND_COUNTS_AS_LIFTING.has(e.kind) && e.sets > MIN_SETS_AFTER_CUT ? { ...e, sets: e.sets - 1 } : e,
    )
    notes.push('A set off each lift, because you asked for it. Same movements, same weights, smaller day.')
  }

  return { exercises: out, notes }
}

/** Below this a movement stops training anything, so a cut leaves it alone. */
const MIN_SETS_AFTER_CUT = 2

/** Cutting a set off a stretch or a warm-up is not a reduction anybody feels. */
const KIND_COUNTS_AS_LIFTING = new Set<ResolvedExercise['kind']>(['lift', 'core', 'carry'])
