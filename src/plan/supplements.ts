import type { DietStyle, FoodLimits } from '../types'
import type { Demand, SuppressionSignal, SupplementRecord } from '../supplementTypes'
import { blockedBy } from './foodLimits'

// ============================================================
// The supplement catalog, out of foods.ts and into a shape that can
// carry a reason.
//
// R16 read the evidence for every item the app was offering and the
// summary is uncomfortable: most of them do not survive a claim.
// Creatine and caffeine are AIS Group A with real effect sizes. Vitamin
// D and iron are MEDICAL supplements whose only claim is correcting a
// deficiency the app cannot measure. Magnesium was moved to Group C by
// the AIS. Collagen's tissue-strength result was measured in an
// engineered ligament construct bathed in subjects' serum, not in a
// human tendon. Fish oil's best-established supplement-specific effect
// is a HARM: about a 25 percent relative increase in atrial fibrillation
// across seven cardiovascular outcome trials.
//
// So `appClass` is BodyT's own call and it is deliberately stricter than
// the AIS group:
//
//   suggest   the app may put it in front of somebody unasked
//   offer     it appears on the shelf, with its hedge in the same breath
//   ask-only  it exists in the catalog and the app never raises it first
//   never     the app does not name it at all, and a test proves that
//
// The `never` rows are not dead weight. They are the list of things a
// future session will be tempted to add, written down with the reason,
// and a guard asserts none of them can ever be offered.
// ============================================================

const R = (r: SupplementRecord): SupplementRecord => r

export const SUPPLEMENT_CATALOG: SupplementRecord[] = [
  R({
    id: 'creatine',
    name: 'Creatine monohydrate',
    aisGroup: 'A',
    evidenceTier: 'A',
    appClass: 'suggest',
    claim: 'More work in hard sets, and a bit more muscle alongside training that earns it.',
    dose: { low: 3, high: 5, unit: 'g', display: '3 to 5 g' },
    // The pre versus post question is unresolved and the only trial of
    // record is n=19 and largely null, so the app makes no timing claim.
    when: 'Any time of day',
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: ['minor', 'pregnancy', 'kidney'],
    sourceRefs: ['S2', 'S35', 'S34'],
    // 1 to 2 kg of water weight in the first weeks. The weight trend the
    // nutrition engine reads has to be told, or it reads it as fat gain.
    confoundsWeightTrend: true,
  }),
  R({
    id: 'caffeine',
    name: 'Caffeine',
    aisGroup: 'A',
    evidenceTier: 'A',
    appClass: 'offer',
    claim: 'Endurance improves most; strength and sprint effects are smaller.',
    hedge: 'Individual response varies a lot and is partly genetic.',
    dose: { low: 3, high: 6, unit: 'mg', perKg: true, display: '100 to 200 mg' },
    when: '30 to 45 min before a session',
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: ['minor', 'pregnancy', 'hypertension', 'heart-rhythm', 'cyp1a2-inhibitor', 'evening-session'],
    sourceRefs: ['S3'],
  }),
  R({
    id: 'electrolytes',
    name: 'Electrolytes',
    aisGroup: 'A',
    evidenceTier: 'A',
    appClass: 'offer',
    claim: 'Replaces sodium and fluid lost in long or hot sessions.',
    hedge: 'Not measurable for a 45 minute indoor session.',
    dose: { low: 1, high: 1, unit: 'g', display: '1 serving' },
    when: 'Around long or hot training',
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: ['hypertension', 'sodium-restricted', 'kidney'],
    sourceRefs: ['S7', 'S11'],
    requiresDemand: 'long-or-hot-sessions',
  }),
  R({
    id: 'vitD3',
    name: 'Vitamin D3',
    aisGroup: 'A',
    evidenceTier: 'A',
    appClass: 'offer',
    claim: 'Corrects a low blood level of vitamin D. That is the whole claim.',
    hedge: 'In people who are not deficient the big trials found no benefit, and this app cannot measure your level.',
    // The adult upper limit is 4,000 IU and the old catalog asked for
    // exactly that, then put a multivitamin next to it. A ceiling is not
    // a target, so the display range stops well short of it.
    dose: { low: 1000, high: 2000, unit: 'IU', upperLimit: 4000, display: '1000 to 2000 IU' },
    when: 'With a meal that has fat in it',
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: ['minor', 'pregnancy', 'kidney', 'diuretic-or-digoxin'],
    sourceRefs: ['S14', 'S25', 'S26'],
  }),
  R({
    id: 'fishOil',
    name: 'Fish oil',
    aisGroup: 'B',
    evidenceTier: 'B',
    appClass: 'offer',
    claim: 'Raises omega-3 intake.',
    // The only well-established supplement-specific effect is a harm, so
    // it is said in the same breath as the claim and not in a footnote.
    hedge: 'Recovery claims are mixed and small. Higher doses have been linked to a raised risk of an irregular heartbeat.',
    dose: { low: 1, high: 2, unit: 'g', display: '1 to 2 g combined EPA and DHA' },
    when: 'With a meal',
    excludesDiet: ['vegetarian', 'vegan'],
    allergenTerms: ['fish'],
    suppressOn: ['anticoagulant', 'heart-rhythm', 'pregnancy'],
    sourceRefs: ['S8', 'S24'],
  }),
  R({
    id: 'multivitamin',
    name: 'Multivitamin',
    aisGroup: 'B',
    evidenceTier: 'A',
    appClass: 'ask-only',
    claim: 'Covers gaps in a diet that is short of something. Nothing else.',
    hedge: 'The prevention trials came back insufficient, and it does nothing for performance in somebody already eating enough.',
    dose: { low: 1, high: 1, unit: 'g', display: '1 serving' },
    when: 'With breakfast',
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: ['smoker', 'iron-loading', 'diuretic-or-digoxin', 'antibiotic-separation'],
    sourceRefs: ['S8', 'S17', 'S11'],
  }),
  R({
    id: 'magnesium',
    name: 'Magnesium glycinate',
    aisGroup: 'C',
    evidenceTier: 'B',
    appClass: 'ask-only',
    // The sleep claim rests on three trials in 151 older adults at LOW
    // GRADE certainty, whose own authors call the literature substandard
    // for making recommendations. So there is no claim sentence.
    claim: null,
    hedge: 'The sleep evidence is three small trials and the authors themselves say it is not enough to recommend on.',
    // Supplemental magnesium tops out at 350 mg a day. The old catalog
    // asked for up to 400, which is over the limit, not near it.
    dose: { low: 200, high: 350, unit: 'mg', upperLimit: 350, display: '200 to 350 mg' },
    when: 'With a meal',
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: ['kidney', 'antibiotic-separation'],
    sourceRefs: ['S9', 'S28', 'S15'],
  }),
  R({
    id: 'collagen',
    name: 'Collagen with vitamin C',
    aisGroup: 'B',
    evidenceTier: 'C',
    appClass: 'ask-only',
    claim: 'Raises a blood marker of collagen synthesis after a dose taken before short loading.',
    hedge: 'That marker is genuinely all that has been shown in a person. No trial shows fewer tendon injuries.',
    dose: { low: 10, high: 15, unit: 'g', display: '10 to 15 g' },
    when: '30 to 60 min before jumping or sprinting',
    excludesDiet: ['vegetarian', 'vegan'],
    // Sources vary by brand: usually hide, sometimes fish. Over-excluding
    // costs a supplement nobody needs; under-excluding costs a reaction.
    allergenTerms: ['beef', 'fish'],
    suppressOn: [],
    sourceRefs: ['S8', 'S29', 'S30'],
    requiresDemand: 'jump-or-sprint',
  }),

  // ---- Named so they can never be offered ----
  //
  // Every row below is something a future session will reasonably think
  // of adding. They are in the catalog with `never` and a reason, and a
  // test asserts nothing classed `never` can reach a shelf. Zinc is here
  // rather than deleted for exactly that reason: it was withdrawn in W5
  // and the catalog should remember why, not just forget it existed.
  R({
    id: 'zinc',
    name: 'Zinc',
    aisGroup: 'A',
    evidenceTier: 'A',
    appClass: 'never',
    claim: null,
    hedge: 'Corrects a deficiency this app cannot measure, and 50 mg a day measurably degraded copper status in healthy men.',
    dose: { low: 8, high: 11, unit: 'mg', upperLimit: 40, display: 'not offered' },
    when: null,
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: [],
    sourceRefs: ['S7', 'S16', 'S36'],
  }),
  R({
    id: 'bcaa',
    name: 'BCAA',
    aisGroup: 'C',
    evidenceTier: 'B',
    appClass: 'never',
    claim: null,
    hedge: 'Superseded by whole protein. If the protein target is met these add nothing.',
    dose: { low: 0, high: 0, unit: 'g', display: 'not offered' },
    when: null,
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: [],
    sourceRefs: ['S9'],
  }),
  R({
    id: 'testBooster',
    name: 'Testosterone booster',
    aisGroup: 'D',
    evidenceTier: 'B',
    appClass: 'never',
    claim: null,
    hedge: 'The category is a marketing construct and a documented contamination hotspot.',
    dose: { low: 0, high: 0, unit: 'g', display: 'not offered' },
    when: null,
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: [],
    sourceRefs: ['S10', 'S39', 'S40'],
  }),
  R({
    id: 'fatBurner',
    name: 'Fat burner',
    aisGroup: 'D',
    evidenceTier: 'B',
    appClass: 'never',
    claim: null,
    hedge: 'The highest documented rate of undeclared stimulants of any shelf, and a real share of drug-induced liver injury cases.',
    dose: { low: 0, high: 0, unit: 'g', display: 'not offered' },
    when: null,
    excludesDiet: [],
    allergenTerms: [],
    suppressOn: [],
    sourceRefs: ['S38', 'S39', 'S41'],
  }),
]

const BY_ID = new Map(SUPPLEMENT_CATALOG.map((r) => [r.id, r]))

/** The record behind a stored id, or undefined for something a user typed. */
export function supplementRecord(id: string): SupplementRecord | undefined {
  return BY_ID.get(id)
}

/**
 * Whole-person suppression. A minor, a pregnancy, a kidney or a liver
 * condition: the app shows no supplement copy at all, on any screen.
 * The first of these wins outright and nothing further is rendered.
 */
const HARD_STOP: SuppressionSignal[] = ['minor', 'pregnancy', 'kidney', 'liver']

export interface StackContext {
  dietStyle: DietStyle
  limits?: FoodLimits
  /** Everything known about the athlete that switches something off. */
  signals: SuppressionSignal[]
  /** What their training actually demands. Absent demand means no offer. */
  demands: Demand[]
}

/**
 * WHAT IS NOT WIRED HERE, said plainly.
 *
 * R16 splits the catalog into things the app may raise unasked and
 * things it may only show when asked. The owner decided the stack is
 * opt-in, so nothing is ever raised unasked and that split has no
 * consumer. There is therefore no suggestStack function: an exported
 * one with no caller reads as a feature that exists.
 *
 * `appClass` and `requiresDemand` are kept on the records because they
 * are real, sourced facts and the day the app earns the right to raise
 * something first it will need them. A test names them as unread, so
 * the gap is visible rather than looking finished.
 */

/**
 * The shelf: everything this person may add, and nothing else.
 *
 * Returns [] outright for a whole-person suppression, and otherwise
 * filters on diet, on declared signals, and last of all on the same
 * allergen gate the meals go through, because a fish allergy that kept
 * somebody away from salmon used to hand them fish oil on the next
 * screen.
 */
export function offeredSupplements(ctx: StackContext): SupplementRecord[] {
  if (ctx.signals.some((sig) => HARD_STOP.includes(sig))) return []
  return SUPPLEMENT_CATALOG.filter((r) => {
    if (r.appClass === 'never') return false
    if (r.excludesDiet.includes(ctx.dietStyle)) return false
    if (r.suppressOn.some((sig) => ctx.signals.includes(sig))) return false
    // requiresDemand deliberately does NOT apply here. It gates whether
    // the app raises something FIRST, not whether somebody may add it:
    // an athlete knows they sweat before the app can see a long session.
    return blockedBy({ name: r.name, ingredients: r.allergenTerms }, ctx.limits) === null
  })
}
