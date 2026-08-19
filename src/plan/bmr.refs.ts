import { confidenceOf, type KnowledgeRecord, type ModuleRefs } from './knowledge'
import {
  CUNNINGHAM_INTERCEPT,
  CUNNINGHAM_PER_KG_FFM,
  FRESH_TAPE_DAYS,
  KCAL_PER_LB,
  MET_ANCHORS,
  MIFFLIN_PER_CM,
  MIFFLIN_PER_KG,
  MIFFLIN_PER_YEAR,
  PAL_BANDS,
  PAL_CEILING,
} from './bmr'

// ============================================================
// Provenance for the calorie baseline.
//
// This is the file that makes the point of the whole envelope legible.
// Three models sit next to each other in plan/bmr.ts and, read as code,
// they look like three equally good options. They are not. Two of them
// are published equations with validation studies behind them and one of
// them is a number somebody picked, and the app spent its entire life so
// far using the third.
//
// So the tiers here do real work. Cunningham and Mifflin are A. The
// activity bands are A for the bands and D for the cut-points between
// them, recorded as separate claims rather than blurred into one. The
// bodyweight multiplier is D with no source at all, which is the honest
// entry: it has none.
//
// No contradiction_group on any of the three. They are not evidence in
// disagreement, they are three models with different input requirements
// and a documented order of preference, and marking them as a live
// dispute would discount two published equations for a conflict that
// does not exist.
//
// Sources are R1's own table, ids unchanged, so a record here and a row
// in research/R1-nutrition.md are the same claim.
// ============================================================

const SOURCES: ModuleRefs['sources'] = {
  S1: {
    cite: 'Mifflin MD et al., A new predictive equation for resting energy expenditure in healthy individuals, Am J Clin Nutr 1990;51(2):241-247',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
    tier: 'A',
  },
  S2: {
    cite: 'Frankenfield D, Roth-Yousey L, Compher C, Comparison of predictive equations for resting metabolic rate in healthy nonobese and obese adults, J Am Diet Assoc 2005;105(5):775-789',
    url: 'https://pubmed.ncbi.nlm.nih.gov/15883556/',
    tier: 'A',
  },
  S3: {
    cite: 'Cunningham JJ, Body composition as a determinant of energy expenditure, Am J Clin Nutr 1991;54(6):963-969',
    url: 'https://pubmed.ncbi.nlm.nih.gov/1957828/',
    tier: 'A',
  },
  S4: {
    cite: 'Tinsley GM et al., Resting metabolic rate in resistance-trained individuals: comparison of prediction equations, Eur J Sport Sci 2019;19(10):1367-1376',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30982438/',
    tier: 'B',
  },
  S6: {
    cite: 'Institute of Medicine (NASEM), Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein and Amino Acids, 2005, ch. 12 (physical activity level categories)',
    url: 'https://nap.nationalacademies.org/catalog/10490',
    tier: 'A',
  },
  S26: {
    cite: 'Hodgdon JA, Beckett MB, Prediction of percent body fat for U.S. Navy men and women from body circumferences and height, Naval Health Research Center report 84-11, 1984',
    url: 'https://apps.dtic.mil/sti/citations/ADA143890',
    tier: 'B',
  },
  S27: {
    cite: 'Ainsworth BE et al., 2011 Compendium of Physical Activities, Med Sci Sports Exerc 2011;43(8):1575-1581',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21681120/',
    tier: 'A',
  },
}

const VALID_FROM = '2026-08-19'
const base = { valid_from: VALID_FROM, schema_version: 1, review_status: 'published' } as const

function record<P>(r: Omit<KnowledgeRecord<'nutrition', P>, 'confidence'>): KnowledgeRecord<'nutrition', P> {
  return { ...r, confidence: confidenceOf(r) }
}

const RECORDS: KnowledgeRecord[] = [
  record({
    ...base,
    id: 'nutrition:rmr.katchMcArdle',
    domain: 'nutrition',
    // Cunningham 1991. The fitness world calls it Katch-McArdle because
    // the McArdle/Katch/Katch textbook popularised it, and a 1980
    // Cunningham variant (500 + 22 x FFM) also circulates. We use the
    // 1991 form only, and a test asserts it is not the other one.
    payload: {
      intercept: CUNNINGHAM_INTERCEPT,
      perKgFfm: CUNNINGHAM_PER_KG_FFM,
      units: 'kcal/day from fat-free mass in kg',
    },
    source_refs: [{ id: 'S3' }, { id: 'S4' }],
    evidence_tier: 'A',
    tags: ['energy', 'rmr', 'body-composition'],
  }),
  record({
    ...base,
    id: 'nutrition:rmr.mifflinStJeor',
    domain: 'nutrition',
    payload: {
      perKg: MIFFLIN_PER_KG,
      perCm: MIFFLIN_PER_CM,
      perYear: MIFFLIN_PER_YEAR,
      units: 'kcal/day from kg, cm, years and sex',
    },
    source_refs: [{ id: 'S1' }, { id: 'S2' }],
    evidence_tier: 'A',
    tags: ['energy', 'rmr'],
  }),
  record({
    ...base,
    id: 'nutrition:rmr.bodyweightMultiplier',
    domain: 'nutrition',
    // The number this app ran on for its whole life. No study, no age
    // term, linear in total mass, so it inflates badly at the top: it
    // puts a 320 lb man at 4,800 kcal where both equations above put him
    // near 3,000. Tier D with an empty source list is the honest record.
    payload: { male: KCAL_PER_LB.male, female: KCAL_PER_LB.female, units: 'kcal/lb/day' },
    source_refs: [],
    evidence_tier: 'D',
    tags: ['energy', 'rmr', 'house'],
  }),
  record({
    ...base,
    id: 'nutrition:pal.bands',
    domain: 'nutrition',
    payload: { bands: PAL_BANDS.map((b) => b.band), ceiling: PAL_CEILING, units: 'multiple of resting energy' },
    source_refs: [{ id: 'S6' }],
    evidence_tier: 'A',
    tags: ['energy', 'activity'],
  }),
  record({
    ...base,
    id: 'nutrition:pal.cutPoints',
    domain: 'nutrition',
    // The bands are sourced. Which band a given training week lands in is
    // ours, and so is where inside the band an unanswered movement
    // question sits. Two claims, two records, because averaging a
    // sourced range with a house cut-point into one number is exactly how
    // a heuristic ends up wearing a citation.
    payload: { sessionsPerWeek: PAL_BANDS.map((b) => b.upToSessions), units: 'completed sessions/week' },
    source_refs: [],
    evidence_tier: 'D',
    tags: ['energy', 'activity', 'house'],
  }),
  record({
    ...base,
    id: 'nutrition:met.anchors',
    domain: 'nutrition',
    payload: { ...MET_ANCHORS, units: 'METs; net cost is (MET - 1) x kg x hours' },
    source_refs: [{ id: 'S27' }],
    evidence_tier: 'A',
    tags: ['energy', 'activity'],
  }),
  record({
    ...base,
    id: 'nutrition:tape.freshness',
    domain: 'nutrition',
    // The Navy method's error is sourced. How long a reading stays
    // usable is not: sixty days is ours, picked because the alternative
    // is carrying a fat-free mass that describes a body the athlete no
    // longer has.
    payload: { days: FRESH_TAPE_DAYS, units: 'days since the reading' },
    source_refs: [{ id: 'S26' }],
    evidence_tier: 'D',
    tags: ['body-composition', 'house'],
  }),
]

export const BMR_REFS: ModuleRefs = {
  module: 'plan/bmr.ts',
  pack: 'R1',
  sources: SOURCES,
  records: RECORDS,
}
