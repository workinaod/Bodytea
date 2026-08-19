import { describe, expect, it } from 'vitest'
import { migrateSupplementStack } from './mealPlanSchema'
import { SUPPLEMENT_CATALOG, supplementRecord } from '../plan/supplements'

// ============================================================
// The reason this migration exists, in one sentence: fixing the catalog
// fixed nobody.
//
// W5 corrected three real safety defects. Supplemental magnesium came
// down under its 350 mg upper limit from a range that asked for 400.
// Vitamin D came off its own 4,000 IU ceiling. Zinc was withdrawn for
// having no supportable claim in a healthy athlete. Every one of those
// corrections landed in the catalog, and every one of them reached
// exactly nobody who had already onboarded, because the dose was a
// STRING copied into their booklet at signup and read forever after.
// Their screen still said 400 mg.
//
// After this, an app-suggested item is an id. The dose is read from the
// catalog at render time, so the next correction ships to everybody on
// the next deploy and needs no migration at all.
// ============================================================

type Stack = { id: string; source?: string; name?: string; dose?: string; when?: string }[]

function migrate(supplements: Stack): Stack {
  const env = { data: { plan: { mealPlan: { supplements } } } } as unknown as Record<string, unknown>
  const out = migrateSupplementStack(env) as unknown as {
    data: { plan: { mealPlan: { supplements: Stack } } }
  }
  return out.data.plan.mealPlan.supplements
}

/** What a v20 booklet actually held: four strings, frozen at signup. */
const OLD_STACK: Stack = [
  { id: 'creatine', name: 'Creatine monohydrate', dose: '5 g', when: 'Daily, any time' },
  { id: 'magnesium', name: 'Magnesium', dose: '200-400 mg', when: 'Before bed' },
  { id: 'zinc', name: 'Zinc', dose: '15-25 mg', when: 'With a meal' },
  { id: 'u_9f2', name: 'Ashwagandha', dose: '600 mg', when: 'Evening' },
]

describe('what a stored stack becomes', () => {
  it('turns an app suggestion into an id and nothing else', () => {
    const out = migrate([...OLD_STACK])
    const creatine = out.find((s) => s.id === 'creatine')!
    expect(creatine.source).toBe('app')
    expect(creatine.dose, 'a stored dose is exactly what went stale').toBeUndefined()
    expect(creatine.name).toBeUndefined()
  })

  it('drops the 400 mg magnesium line off every existing screen', () => {
    // The defect, stated as the user would have experienced it: they were
    // told 400 mg, the app corrected itself, and they never saw it.
    const out = migrate([...OLD_STACK])
    expect(out.find((s) => s.id === 'magnesium')?.dose).toBeUndefined()
    expect(supplementRecord('magnesium')!.dose.display).toBe('200 to 350 mg')
    expect(supplementRecord('magnesium')!.dose.high).toBeLessThanOrEqual(350)
  })

  it('withdraws zinc rather than leaving it on disk forever', () => {
    // It was app-authored advice with no supportable claim. Leaving it
    // means the app keeps telling somebody to take it for years. Anybody
    // who genuinely wants it can add it back, and then it is theirs.
    expect(migrate([...OLD_STACK]).some((s) => s.id === 'zinc')).toBe(false)
  })

  it('keeps what the athlete typed themselves, word for word', () => {
    // The app may retract its own advice. It may not edit somebody's
    // record of what they take.
    const own = migrate([...OLD_STACK]).find((s) => s.id === 'u_9f2')!
    expect(own.source).toBe('user')
    expect(own.name).toBe('Ashwagandha')
    expect(own.dose).toBe('600 mg')
    expect(own.when).toBe('Evening')
  })

  it('repairs the empty dose the old sheet used to write', () => {
    const out = migrate([{ id: 'u_1', name: 'Something', dose: ', ', when: '' }])
    expect(out[0].dose).toBe('')
  })

  it('invents no date for a row that predates the field', () => {
    // Writing "today" would be a lie the rest of the app then reads as
    // fact. Absent is the honest value.
    for (const s of migrate([...OLD_STACK])) {
      expect((s as { addedAt?: string }).addedAt).toBeUndefined()
    }
  })

  it('is safe to run twice', () => {
    const once = migrate([...OLD_STACK])
    const twice = migrate(once)
    expect(twice).toEqual(once)
  })

  it('leaves an envelope with no stack alone', () => {
    const env = { data: { plan: {} } } as unknown as Record<string, unknown>
    expect(() => migrateSupplementStack(env)).not.toThrow()
  })
})

describe('the property that makes the shape worth the migration', () => {
  it('resolves every app id against the live catalog', () => {
    // This is the whole point. A stored id has no dose, so tomorrow's
    // correction reaches an account created a year ago.
    for (const s of migrate([...OLD_STACK]).filter((x) => x.source === 'app')) {
      expect(supplementRecord(s.id), `${s.id} stored as app and not in the catalog`).toBeTruthy()
    }
  })

  it('never migrates a stored id into something the app refuses to offer', () => {
    const kept = migrate([...OLD_STACK]).filter((s) => s.source === 'app').map((s) => s.id)
    const never = SUPPLEMENT_CATALOG.filter((r) => r.appClass === 'never').map((r) => r.id)
    expect(kept.filter((id) => never.includes(id))).toEqual([])
  })
})

describe('what R16 specifies and this does not do yet', () => {
  it('carries the class and the demand as data that nothing reads', () => {
    // Said out loud rather than left to look finished. The stack is
    // opt-in, so the app never raises anything first, so the split
    // between suggest and ask-only has no consumer and neither does
    // requiresDemand. Both are real, sourced facts kept for the day the
    // app earns the right to raise something, and until then this test
    // is the honest record that they are inert.
    expect(SUPPLEMENT_CATALOG.some((r) => r.appClass === 'suggest')).toBe(true)
    expect(SUPPLEMENT_CATALOG.some((r) => r.requiresDemand)).toBe(true)
  })
})
