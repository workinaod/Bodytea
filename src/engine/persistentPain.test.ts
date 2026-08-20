import { describe, expect, it } from 'vitest'
import { defaultWeekState, emptyAppData, type AppData, type EquipTag, type ResolvedExercise } from '../types'
import { getExercise } from '../plan/exercises'
import { adaptContext, planAdjustments } from './adapt'
import { PAIN_PERSISTS_DAYS, persistentPainJoints } from './signals'
import { addDaysISO } from './calendar'

// ============================================================
// The sentence this app has always ended on, finally kept.
//
// adapt.ts has told athletes since it was written that "if it is still
// there in two weeks, that is a question for a physio and not for an
// app". Nothing checked. The line repeated itself every session for as
// long as the joint kept hurting, which is the app naming a deadline and
// then declining to notice it passing.
//
// R3 s9.2's joint-pain row asks for the other half too: if pain notes
// continue on the substitute, the substitution was not the fix, so stop
// substituting. Every substitute was already chosen to spare that joint,
// so offering another one is trying the same answer a third time.
// ============================================================

const TODAY = '2026-08-14'
const MONDAY = '2026-08-10'
const PRESS = 'flat-db-press' // stresses shoulder AND elbow
const GYM = new Set<EquipTag>(['none', 'dumbbell', 'barbell', 'bench', 'rack', 'machine'])

function base(): AppData {
  const d = emptyAppData(MONDAY, TODAY)
  d.settings.onboarded = true
  d.weeks[MONDAY] = defaultWeekState(MONDAY)
  return d
}

/** A pain note on the pressing movement, on each of these dates. */
function aching(d: AppData, dates: string[]): AppData {
  for (const date of dates) {
    d.sessions[date] = {
      date,
      templateId: 'monday',
      status: 'completed',
      exercises: [],
      fatigue: [{ exerciseId: PRESS, reason: 'pain', atSetIdx: 2, regions: ['chest'] }],
    } as unknown as AppData['sessions'][string]
  }
  return d
}

const ex = (exerciseId: string): ResolvedExercise => {
  const def = getExercise(exerciseId)
  return { exerciseId, name: def.name, kind: def.kind, restSec: def.restSec, sets: 3, repText: '8' }
}

/** Days back from today, as dates. */
const ago = (...ns: number[]) => ns.map((n) => addDaysISO(TODAY, -n))

describe('how long has this actually been going on', () => {
  it('calls a joint persistent once its run outlasts two weeks', () => {
    // 18 days of complaint, still live today.
    const d = aching(base(), ago(18, 11, 4, 0))
    expect(persistentPainJoints(d, TODAY)).toContain('shoulder')
  })

  it('does not call two separate flares one long injury', () => {
    // Once last winter, once this morning. A joint that went quiet for
    // months recovered; what came back is a new complaint, not a
    // ten-month one.
    const d = aching(base(), ago(300, 0))
    expect(persistentPainJoints(d, TODAY)).toHaveLength(0)
  })

  it('does not send anybody to a physio over a joint that stopped hurting', () => {
    // A real 20-day run, but it ended a month ago.
    const d = aching(base(), ago(50, 43, 36, 30))
    expect(persistentPainJoints(d, TODAY)).toHaveLength(0)
  })

  it('holds the line exactly where the sentence promised', () => {
    // Pinned as literals. A boundary asserted against its own constant
    // passes at any value, which this session has now found five times.
    expect(PAIN_PERSISTS_DAYS).toBe(14)
    expect(persistentPainJoints(aching(base(), ago(14, 7, 0)), TODAY)).toContain('shoulder')
    expect(persistentPainJoints(aching(base(), ago(13, 7, 0)), TODAY)).toHaveLength(0)
  })
})

describe('what the plan does about it', () => {
  it('swaps the movement while the complaint is still young', () => {
    const d = aching(base(), ago(6, 3))
    const out = planAdjustments([ex(PRESS)], adaptContext(d, TODAY, [...GYM] as EquipTag[]))
    const sub = out.find((a) => a.kind === 'substitute')
    expect(sub).toBeDefined()
    expect(sub!.automatic).toBe(true)
  })

  it('stops swapping once the swap has had two weeks to work', () => {
    const d = aching(base(), ago(18, 11, 4, 0))
    const out = planAdjustments([ex(PRESS)], adaptContext(d, TODAY, [...GYM] as EquipTag[]))
    expect(out.find((a) => a.kind === 'substitute')).toBeUndefined()
    const drop = out.find((a) => a.kind === 'reduce-load')
    expect(drop).toBeDefined()
    expect(drop!.because).toContain('two weeks running')
    expect(drop!.because).toContain('physio')
  })

  it('stops repeating a deadline that has already passed', () => {
    const d = aching(base(), ago(18, 11, 4, 0))
    const out = planAdjustments([ex(PRESS)], adaptContext(d, TODAY, [...GYM] as EquipTag[]))
    const drop = out.find((a) => a.kind === 'reduce-load')!
    // The old line promised a future check that had already come and gone.
    expect(drop.because).not.toContain('still there in two weeks')
  })
})

describe('it says this once', () => {
  it('names every stuck joint in one card, not one card per joint', () => {
    // Caught by screenshot in the slice 5 review pass. A pressing movement
    // stresses the shoulder AND the elbow, so a single pain note makes
    // both persistent, and the engine files each movement under the FIRST
    // of its stressed joints. flat-db-press lists shoulder first and
    // close-grip-press lists elbow first, so the athlete got the same
    // four-sentence paragraph twice with one word changed. How many cards
    // you saw came down to the order of two strings in the catalog, which
    // is not a thing that should be visible from the outside at all.
    const d = aching(base(), ago(18, 11, 4, 0))
    const joints = persistentPainJoints(d, TODAY)
    expect(joints).toContain('shoulder')
    expect(joints).toContain('elbow')

    const out = planAdjustments(
      [ex(PRESS), ex('close-grip-press')],
      adaptContext(d, TODAY, [...GYM] as EquipTag[]),
    )
    const drops = out.filter((a) => a.kind === 'reduce-load')
    expect(drops).toHaveLength(1)
    expect(drops[0].because).toContain('shoulder and elbow')
    expect(drops[0].because).toContain('have been sore')
  })

  it('still reads as one joint when only one is stuck', () => {
    // The plural must not leak into the single case: "your shoulder have
    // been complaining" is the sort of sentence that costs an app trust.
    const d = base()
    d.prefs.limitations = [{ label: 'elbow', joints: ['elbow'], since: '2026-01-01' }]
    aching(d, ago(18, 11, 4, 0))
    const out = planAdjustments([ex(PRESS)], adaptContext(d, TODAY, [...GYM] as EquipTag[]))
    const stuck = out.filter((a) => a.kind === 'reduce-load' && a.because.includes('two weeks running'))
    expect(stuck).toHaveLength(1)
    expect(stuck[0].because).toContain('Your shoulder has been sore')
  })
})

describe('told, or noticed', () => {
  // Found by seeding every card at once. The reduce-load branch has
  // distinguished a stated limitation from an inferred one since
  // somebody eighteen months past a knee replacement was told their knee
  // "keeps getting flagged". The SWAP branch never got the same
  // treatment, so the screen said "your shoulder has been complaining"
  // beside "your shoulder has been quiet for 3 sessions".
  const swapFor = (d: AppData) =>
    planAdjustments([ex(PRESS)], adaptContext(d, TODAY, [...GYM] as EquipTag[])).find(
      (a) => a.kind === 'substitute',
    )!

  it('does not tell somebody their own answer has been complaining', () => {
    const d = base()
    d.prefs.limitations = [{ label: 'shoulder', joints: ['shoulder'], since: '2026-01-01' }]
    expect(swapFor(d).because).toContain('You told me about your shoulder')
    expect(swapFor(d).because).not.toContain('complaining')
  })

  it('still says complaining when the app worked it out itself', () => {
    const d = aching(base(), ago(6, 3))
    expect(swapFor(d).because).toContain('has been complaining')
  })
})
