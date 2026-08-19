import type { ISODate } from '../types'

// ============================================================
// Where a number came from, attached to the number.
//
// This app decides what somebody eats and how heavy they lift, and until
// now essentially none of those numbers said where they came from. Around
// sixty population constants sit in engine files as bare literals: a
// stride of 0.55, a TDEE of bodyweight times fifteen, a plate step of 5
// or 10 lb, a pain threshold of two complaints in fourteen days. Some are
// straight off a position stand and some were invented on a Tuesday, and
// the code makes them look identical.
//
// That is the whole problem this envelope solves. Not storage, not
// retrieval, not scale. Just: which of these did we read somewhere, which
// did we make up, and can the build tell the difference.
//
// THREE RULES, and the tests below enforce all three.
//
//   Provenance or a confession. A record is tier A, B or C only if it
//   cites something. Tier D means house heuristic, and a house heuristic
//   is allowed, it is just not allowed to be dressed as evidence.
//
//   Confidence is computed, never typed. A hand-written confidence is a
//   vibe with a decimal point on it. confidenceOf derives it from the
//   tier, whether we could only reach a summary of a paywalled primary,
//   and whether the record is in a group where the evidence disagrees.
//
//   Disagreement is preserved, not flattened. When two sources conflict,
//   both records exist and share a contradiction_group. Retrieval picks
//   one; the explain layer can still say the evidence is split. Averaging
//   them into a single confident-looking number is the failure mode.
//
// Designed in research/B3-knowledge-store.md, which is also where the
// stages after this one live. This is stage one and deliberately small:
// the data modules are NOT rewritten. MOVEMENT stays exactly as it is and
// a sibling movement.refs.ts carries its provenance, which keeps every
// diff reviewable and every file under its cap.
// ============================================================

export type Domain =
  | 'movement'
  | 'exercise'
  | 'program'
  | 'nutrition'
  | 'safety'
  | 'food'
  | 'recipe'
  | 'population'

/**
 * A: position stand, guideline body, systematic review, or a primary
 *    screening instrument.
 * B: a single trial, or an authoritative reproduction of a primary.
 * C: summary-level access to a paywalled primary, or a finding contested
 *    on reanalysis.
 * D: house heuristic. source_refs may be empty, and confidence says so.
 */
export type EvidenceTier = 'A' | 'B' | 'C' | 'D'

export type ReviewStatus = 'draft' | 'reviewed' | 'published' | 'retired'

export interface SourceRef {
  /** Stable within its pack's source table: 'S9', 'PARQ-2025', 'CDC-ARTH'. */
  id: string
  /** Where inside it: 'Box 3', 'Q6', 'Table 2'. */
  locator?: string
  /**
   * The primary was paywalled and this came from a summary of it.
   *
   * Recorded rather than hidden: it is the difference between having read
   * the study and having read about it, and it costs the record real
   * confidence rather than a footnote nobody sees.
   */
  summaryLevel?: boolean
}

export interface KnowledgeRecord<D extends Domain = Domain, P = unknown> {
  /** '{domain}:{slug}'. Unique, stable forever, never reused. */
  id: string
  domain: D
  /** The domain's own typed shape, unchanged by being wrapped. */
  payload: P
  /** Empty ONLY when evidence_tier is 'D'. */
  source_refs: SourceRef[]
  evidence_tier: EvidenceTier
  /** 0 to 1. DERIVED by confidenceOf, never hand-typed. */
  confidence: number
  /** Records that cannot both apply. Retrieval returns at most one. */
  contradiction_group?: string
  valid_from: ISODate
  /** Absent means open-ended. */
  valid_to?: ISODate
  /** Envelope version, not payload version. */
  schema_version: number
  review_status: ReviewStatus
  tags?: string[]
}

const TIER_BASE: Record<EvidenceTier, number> = { A: 0.95, B: 0.8, C: 0.6, D: 0.4 }

/**
 * Confidence, computed from what we actually have.
 *
 * groupSize is how many records share this one's contradiction_group. A
 * record nobody disagrees with is not discounted; one in a live
 * disagreement is, because the evidence being split is a fact about the
 * number and belongs in it.
 */
export function confidenceOf(r: Omit<KnowledgeRecord, 'confidence'>, groupSize = 1): number {
  const access = r.source_refs.some((s) => s.summaryLevel) ? 0.85 : 1
  const agreement = r.contradiction_group && groupSize > 1 ? 0.75 : 1
  return Math.round(TIER_BASE[r.evidence_tier] * access * agreement * 100) / 100
}

/** One knowledge module, as the registry sees it. */
export interface ModuleRefs {
  /** The file this describes, repo-relative from src: 'plan/movement.ts'. */
  module: string
  /** The pack that sourced it: 'R7', 'R-ONT', 'B3'. */
  pack: string
  /** Every source the module's records may cite, by id. */
  sources: Record<string, { cite: string; url?: string; tier: EvidenceTier }>
  records: KnowledgeRecord[]
}
