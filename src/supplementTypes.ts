import type { DietStyle, ISODate, SupplementId } from './types'

// ============================================================
// What a supplement actually is, as opposed to four strings.
//
// The old shape was `{ id, name, dose, when }`. Every safety fact R16
// found had nowhere to live: no contraindication, no interaction, no
// upper limit, no evidence tier, no source, no reason. A four-string
// type cannot be made safe by being careful with the strings, because
// nothing downstream is able to check them.
//
// The worse half is that those four strings were COPIED INTO USER DATA.
// A dose was written into somebody's booklet once, at onboarding, and
// read forever after. So the corrections made in W5, magnesium's 400 mg
// ceiling down to 350, vitamin D off its own upper limit, zinc withdrawn
// entirely, reached the catalog and reached NOBODY who had already
// onboarded. The v19 to v20 migration comment in store/schema.ts names
// this exact failure mode for calorie targets and it was true here too.
//
// So the single most valuable property of this shape: user data stores
// an ID, not a dose. A correction to the catalog reaches every existing
// user on the next deploy, with no migration at all.
// ============================================================

/** Australian Institute of Sport classification. A is the evidenced tier. */
export type AisGroup = 'A' | 'B' | 'C' | 'D'

/** BodyT's own call, deliberately stricter than the AIS group. */
export type AppClass = 'suggest' | 'offer' | 'ask-only' | 'never'

export interface DoseRange {
  low: number
  high: number
  unit: 'g' | 'mg' | 'IU' | 'mcg'
  /** Dose is per kilogram of body mass. */
  perKg?: boolean
  /** Published Tolerable Upper Intake Level for the SUPPLEMENTAL form. */
  upperLimit?: number
  /**
   * What the user sees. Never a range whose top IS the upper limit: a
   * ceiling is not a target, and putting a multivitamin next to a dose
   * that already touches the limit is how the old catalog went over.
   */
  display: string
}

/**
 * Something about the athlete that switches a suggestion off.
 *
 * Exclusion only, in the spirit of plan/foodLimits.ts: a signal we do
 * not recognise still suppresses, a signal we do recognise suppresses
 * its family, and the result is never widened back. Being over-cautious
 * costs somebody a suggestion. Being under-cautious costs them an
 * interaction.
 */
export type SuppressionSignal =
  | 'minor'
  | 'pregnancy'
  | 'kidney'
  | 'liver'
  | 'heart-rhythm'
  | 'hypertension'
  | 'sodium-restricted'
  | 'anticoagulant'
  | 'diuretic-or-digoxin'
  | 'antibiotic-separation'
  | 'cyp1a2-inhibitor'
  | 'smoker'
  | 'iron-loading'
  | 'tested-athlete'
  | 'evening-session'

/** A training demand that has to EXIST before the app suggests something. */
export type Demand = 'long-or-hot-sessions' | 'anaerobic-1-to-4-min' | 'jump-or-sprint'

export interface SupplementRecord {
  id: SupplementId
  /** An ingredient, never a product category. "Pre-workout" is not a name. */
  name: string
  aisGroup: AisGroup
  /** Same A to D scale plan/knowledge.ts uses, and for the same reason. */
  evidenceTier: 'A' | 'B' | 'C' | 'D'
  appClass: AppClass
  /**
   * The narrowest true sentence, or null when the honest answer is no
   * sentence at all. Two sentences maximum, no jargon.
   */
  claim: string | null
  /** Required whenever appClass is 'offer'. Shown in the same breath. */
  hedge?: string
  dose: DoseRange
  /** The studied timing in the app's words, or null when none holds. */
  when: string | null
  excludesDiet: DietStyle[]
  /**
   * Words that, if the athlete's limits forbid them, suppress this.
   * Named for the allergen and not for the allergy, so it does not
   * collide with the same-named helper in plan/foodLimits.ts. That scan
   * matches on names anywhere in a file, comments included, so a shared
   * name would report a genuinely dead export as live.
   */
  allergenTerms: string[]
  suppressOn: SuppressionSignal[]
  /** Source ids from research/R16-supplements.md section 1. Never empty. */
  sourceRefs: string[]
  /** Taking it distorts the weight trend the nutrition engine reads. */
  confoundsWeightTrend?: boolean
  /** Never suggested unless the athlete's own training shows this. */
  requiresDemand?: Demand
}

/**
 * What a stack stores on disk.
 *
 * An id for anything the app suggested, verbatim text only for what the
 * athlete typed themselves. Two rules make this shape do the work:
 *
 *   'app' items carry NO text. They resolve against the catalog at read
 *   time, so a dose correction ships to everybody on the next deploy.
 *
 *   'user' items are never rewritten and never deleted by the app. They
 *   are somebody's own record of what they take. The app may retract its
 *   own advice. It may not edit a person's health record.
 */
export interface StackItem {
  id: SupplementId
  source: 'app' | 'user'
  /** Present only when source is 'user'. The app never writes these. */
  name?: string
  dose?: string
  when?: string
  /** Absent on rows migrated from the old shape: there is no true value. */
  addedAt?: ISODate
}
