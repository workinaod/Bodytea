import { confidenceOf, type KnowledgeRecord, type ModuleRefs } from './knowledge'
import { MAX_DEFICIT, MIN_KCAL_REST, MIN_KCAL_TRAINING } from './kcalFloor'
import { PROTEIN_G_PER_KG } from './sportsNutrition'

// ============================================================
// Provenance for the nutrition constants, beside them rather than in
// them. plan/kcalFloor.ts and plan/sportsNutrition.ts are unchanged: this
// file imports the values they already export, so a number can never
// drift from its own citation. Change the constant and this record
// changes with it; delete the constant and this stops compiling.
//
// The point is the tier column. Protein bands are off ISSN position
// stands. The calorie floors are ours, picked to be the number a
// clinician would not blink at, and they are marked D for that reason.
// Both kinds of number are fine. Only one of them was ever allowed to
// look like the other.
//
// Sources are R1's own table, ids unchanged, so a record here and a row
// in research/R1-nutrition.md are the same claim.
// ============================================================

const SOURCES: ModuleRefs['sources'] = {
  S7: {
    cite: 'Jager R et al., ISSN Position Stand: Protein and Exercise, JISSN 2017;14:20',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/',
    tier: 'A',
  },
  S9: {
    cite: 'Helms ER, Aragon AA, Fitschen PJ, Evidence-based recommendations for natural bodybuilding contest preparation, JISSN 2014;11:20',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24864135/',
    tier: 'A',
  },
  S10: {
    cite: 'Garthe I et al., Effect of two different weight-loss rates on body composition and performance in elite athletes, IJSNEM 2011;21(2):97-104',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21558571/',
    tier: 'B',
  },
  S16: {
    cite: 'Trexler ET, Smith-Ryan AE, Norton LE, Metabolic adaptation to weight loss: implications for the athlete, JISSN 2014;11:7',
    url: 'https://pubmed.ncbi.nlm.nih.gov/24571926/',
    tier: 'A',
  },
  S24: {
    cite: 'Mountjoy M et al., 2023 IOC consensus statement on Relative Energy Deficiency in Sport, Br J Sports Med 2023;57:1073-1097',
    url: 'https://bjsm.bmj.com/content/57/17/1073',
    tier: 'A',
  },
  S25: {
    cite: '2013 AHA/ACC/TOS Guideline for Management of Overweight and Obesity in Adults',
    url: 'https://www.ahajournals.org/doi/10.1161/01.cir.0000437739.71477.ee',
    tier: 'A',
  },
}

const VALID_FROM = '2026-08-18'

/** Shared envelope fields, so each record below is only its own claim. */
const base = { valid_from: VALID_FROM, schema_version: 1, review_status: 'published' } as const

function record<P>(r: Omit<KnowledgeRecord<'nutrition', P>, 'confidence'>): KnowledgeRecord<'nutrition', P> {
  return { ...r, confidence: confidenceOf(r) }
}

const RECORDS: KnowledgeRecord[] = [
  record({
    ...base,
    id: 'nutrition:protein.hypertrophy.gPerKg',
    domain: 'nutrition',
    payload: { value: PROTEIN_G_PER_KG.hypertrophy, units: 'g/kg/day', context: 'hypertrophy' },
    source_refs: [{ id: 'S7' }],
    evidence_tier: 'A',
    tags: ['macro', 'protein'],
  }),
  record({
    ...base,
    id: 'nutrition:protein.deficit.gPerKg',
    domain: 'nutrition',
    payload: { value: PROTEIN_G_PER_KG.deficit, units: 'g/kg/day', context: 'deficit' },
    source_refs: [{ id: 'S9' }, { id: 'S7' }],
    evidence_tier: 'A',
    tags: ['macro', 'protein', 'cut'],
  }),
  record({
    ...base,
    id: 'nutrition:protein.aggressiveDeficit.gPerKg',
    domain: 'nutrition',
    payload: { value: PROTEIN_G_PER_KG.aggressiveDeficit, units: 'g/kg/day', context: 'aggressiveDeficit' },
    source_refs: [{ id: 'S9' }],
    evidence_tier: 'A',
    tags: ['macro', 'protein', 'cut'],
  }),
  record({
    ...base,
    id: 'nutrition:protein.endurance.gPerKg',
    domain: 'nutrition',
    payload: { value: PROTEIN_G_PER_KG.endurance, units: 'g/kg/day', context: 'endurance' },
    source_refs: [{ id: 'S7' }],
    evidence_tier: 'A',
    tags: ['macro', 'protein', 'endurance'],
  }),
  record({
    ...base,
    id: 'nutrition:deficit.max.pctOfMaintenance',
    domain: 'nutrition',
    // Garthe compared 0.7 vs 1.4 percent of bodyweight per week and the
    // faster arm lost more lean mass. A quarter off maintenance is our
    // translation of that into the number this app actually holds, which
    // is why the record is B rather than A: the finding is sourced, the
    // translation into a percentage ceiling is ours.
    payload: { value: MAX_DEFICIT, units: 'fraction of maintenance kcal' },
    source_refs: [{ id: 'S10' }, { id: 'S16' }],
    evidence_tier: 'B',
    tags: ['energy', 'cut'],
  }),
  record({
    ...base,
    id: 'nutrition:kcalFloor.training',
    domain: 'nutrition',
    // HOUSE. The REDs consensus and the AHA obesity guideline are why a
    // floor exists at all, and neither of them names 1500. We picked the
    // number. Tier D says so, and the confidence it earns says so louder.
    payload: { value: MIN_KCAL_TRAINING, units: 'kcal/day', dayType: 'training' },
    source_refs: [{ id: 'S24' }, { id: 'S25' }],
    evidence_tier: 'D',
    tags: ['energy', 'floor', 'safety'],
  }),
  record({
    ...base,
    id: 'nutrition:kcalFloor.rest',
    domain: 'nutrition',
    payload: { value: MIN_KCAL_REST, units: 'kcal/day', dayType: 'rest' },
    source_refs: [{ id: 'S24' }, { id: 'S25' }],
    evidence_tier: 'D',
    tags: ['energy', 'floor', 'safety'],
  }),
]

export const NUTRITION_REFS: ModuleRefs = {
  module: 'plan/kcalFloor.ts + plan/sportsNutrition.ts',
  pack: 'R1',
  sources: SOURCES,
  records: RECORDS,
}
