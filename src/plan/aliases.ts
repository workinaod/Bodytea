import { EXERCISES } from './exercises'

// ============================================================
// Turning what somebody typed into an exercise this app knows.
//
// R-ONT sized the problem with real data and the number is the whole
// argument: with an aggressive normalizer, only 26 of BodyT's 194 names
// matched free-exercise-db exactly, and "bulgarian" returns ZERO hits in
// that corpus because the same movement is filed under another family
// name. So a name matcher is a candidate generator that a person
// confirms. It is never an authority.
//
// That is the same rule as everywhere else in this app: suggest only,
// never auto. An alias that silently maps somebody's typed movement to
// the wrong exercise is the parsing version of the load-spiral bug.
// Quiet, confident, and wrong.
//
// WHAT THIS IS NOT. It does not ingest a corpus, it does not dedupe
// thousands of records, and it does not create exercises. It answers one
// question: given a string, which catalog entry did they mean, and how
// sure are we. R17's notation parser needs that answer before it can do
// anything at all, which is why this lands first.
// ============================================================

export interface AliasEntry {
  /** Normalized surface form: lowercased, punctuation collapsed, token-sorted. */
  key: string
  /** The catalog id it resolves to. A test asserts this exists. */
  id: string
  /** Where it came from, so a bad one can be traced and removed. */
  source: 'bodyt' | 'wger' | 'user' | 'ingest'
  /** 1.0 is authored and confirmed. Below the threshold it only suggests. */
  confidence: number
}

/** Below this, a hit is a suggestion and never a resolution. HOUSE. */
export const CONFIRM_THRESHOLD = 0.9

/**
 * Abbreviations, expanded before anything else looks at the string.
 *
 * Longest first, so `rdl` inside `db rdl` is not eaten by `db` leaving a
 * fragment behind. The same ordering bug the speech layer's own
 * abbreviation table documents.
 */
const ABBREV: [RegExp, string][] = [
  [/\bcgbp\b/g, 'close grip bench press'],
  [/\bsldl\b/g, 'stiff leg deadlift'],
  [/\brdl\b/g, 'romanian deadlift'],
  [/\bbss\b/g, 'bulgarian split squat'],
  [/\bghr\b/g, 'glute ham raise'],
  [/\bohp\b/g, 'overhead press'],
  [/\bdb\b/g, 'dumbbell'],
  [/\bbb\b/g, 'barbell'],
  [/\bkb\b/g, 'kettlebell'],
  [/\bbw\b/g, 'bodyweight'],
  [/\bsl\b/g, 'single leg'],
]

/** Words that carry no discriminating information in any family. */
const NOISE = new Set(['the', 'a', 'an', 'and', 'with', 'of', 'style'])

export interface Normalized {
  /** Token-sorted key, for lookup. */
  key: string
  /**
   * What was in the parentheses, kept rather than thrown away.
   *
   * R-ONT found that stripping parentheticals creates four name
   * collisions inside free-exercise-db alone, and in every case the
   * parenthetical WAS the distinction: Turkish Get-Up (Lunge style)
   * against (Squat style) is two different movements.
   */
  qualifier: string
}

/**
 * Plural to singular, on one token, by rule rather than by stemmer.
 *
 * A general stemmer is wrong here in a way that matters: it turns
 * "press" into "pres" and then nothing in the catalog matches anything.
 * The order below is the whole implementation, and each line exists for
 * a word people actually type.
 */
function singular(t: string): string {
  // Two letters or fewer is never a plural worth stripping. Three IS:
  // "ups" has to reach "up" or "push ups" and "push up" never converge.
  if (t.length <= 2) return t
  if (/(ss|us|is)$/.test(t)) return t // press, status, axis
  if (/ies$/.test(t)) return `${t.slice(0, -3)}y` // flies -> fly
  if (/(ches|shes|xes|zes|sses)$/.test(t)) return t.slice(0, -2) // presses -> press
  if (/s$/.test(t)) return t.slice(0, -1) // squats -> squat, raises -> raise
  return t
}

/** The six steps, in order. Each one is observable in the output. */
export function normalizeName(raw: string): Normalized {
  const folded = raw.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  const quals: string[] = []
  const stripped = folded.replace(/\(([^)]*)\)/g, (_, inner: string) => {
    quals.push(inner.trim())
    return ' '
  })
  let s = stripped
  for (const [re, full] of ABBREV) s = s.replace(re, full)
  s = s.replace(/[^a-z0-9]+/g, ' ').trim()
  const clean = (raw: string): string[] =>
    raw
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map(singular)
      .filter((t) => t && !NOISE.has(t))
  const tokens = clean(s)
  // The qualifier goes through the same pipeline. It exists to be
  // COMPARED against another qualifier, and "Lunge style" against
  // "lunge" would fail that comparison for no reason anybody meant.
  return { key: [...tokens].sort().join(' '), qualifier: [...clean(quals.join(' '))].sort().join(' ') }
}

/**
 * Surface forms that the normalizer alone cannot converge.
 *
 * R-ONT's worked example: "DB bench", "dumbbell bench press" and "flat db
 * press" token-sort to three different keys, and closing that needs
 * family-specific knowledge rather than a general rule. So the three get
 * three explicit rows and the normalizer handles the long tail.
 */
export const ALIASES: AliasEntry[] = [
  // WHAT IS NOT HERE, and why the table is short.
  //
  // The first draft carried 34 rows. Fifteen of them were exact catalog
  // names, which step 2 of the ladder answers before step 3 ever runs,
  // so they could never fire: dead rows that read as coverage. A guard
  // now refuses them. The normalizer turns out to handle far more than
  // it looked like it would, and what is left below is genuinely the
  // part it cannot converge on its own.
  { key: 'bench dumbbell', id: 'flat-db-press', source: 'bodyt', confidence: 1 },
  { key: 'bench dumbbell press', id: 'flat-db-press', source: 'bodyt', confidence: 1 },
  { key: 'bench dumbbell flat press', id: 'flat-db-press', source: 'bodyt', confidence: 1 },
  { key: 'military press standing', id: 'standing-ohp', source: 'bodyt', confidence: 1 },
  { key: 'overhead press standing', id: 'standing-ohp', source: 'bodyt', confidence: 1 },
  { key: 'barbell overhead press', id: 'standing-ohp', source: 'bodyt', confidence: 1 },
  { key: 'elevated foot rear split squat', id: 'bulgarian-split-squat', source: 'bodyt', confidence: 1 },
  { key: 'grip pull supinated up', id: 'chin-up', source: 'bodyt', confidence: 0.85 },
  { key: 'down pull', id: 'lat-pulldown', source: 'bodyt', confidence: 0.8 },
  { key: 'bent over row', id: 'barbell-row', source: 'bodyt', confidence: 0.85 },
  { key: 'barbell bent over row', id: 'barbell-row', source: 'bodyt', confidence: 1 },
  { key: 'hip thrust', id: 'glute-bridge', source: 'bodyt', confidence: 0.85 },
  { key: 'calf raise seated', id: 'seated-calf-raise', source: 'bodyt', confidence: 1 },
  { key: 'farmer walk', id: 'farmer-carry', source: 'bodyt', confidence: 0.85 },
  { key: 'plank', id: 'plank-side-plank', source: 'bodyt', confidence: 0.85 },
  // Deliberately ambiguous, and left that way. R-ONT's point about a flat
  // array rather than a map: "press" is a real thing people type and a
  // map would have to pick a winner. Three rows means three suggestions.
  { key: 'press', id: 'flat-db-press', source: 'bodyt', confidence: 0.4 },
  { key: 'press', id: 'standing-ohp', source: 'bodyt', confidence: 0.4 },
  { key: 'press', id: 'leg-press', source: 'bodyt', confidence: 0.4 },
]

const CATALOG_KEYS = new Map<string, string[]>()
for (const e of Object.values(EXERCISES)) {
  const k = normalizeName(e.name).key
  CATALOG_KEYS.set(k, [...(CATALOG_KEYS.get(k) ?? []), e.id])
}

const trigrams = (s: string): Set<string> => {
  const p = `  ${s} `
  const out = new Set<string>()
  for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3))
  return out
}

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (!a.size && !b.size) return 0
  let hit = 0
  for (const x of a) if (b.has(x)) hit++
  return hit / (a.size + b.size - hit)
}

/** How close two normalized keys are. Deterministic, no ML, no network. */
export function nameScore(a: string, b: string): number {
  const ta = new Set(a.split(' '))
  const tb = new Set(b.split(' '))
  return 0.6 * jaccard(trigrams(a), trigrams(b)) + 0.4 * jaccard(ta, tb)
}

/** Below this a candidate is not worth showing at all. HOUSE. */
const SUGGEST_FLOOR = 0.35

export type Resolution =
  | { kind: 'resolved'; id: string; how: 'id' | 'name' | 'alias' }
  | { kind: 'suggest'; ids: string[] }
  | { kind: 'unknown' }

/**
 * What they typed, resolved as far as it honestly can be.
 *
 * The ladder is R-ONT s5.3 and the order is the point: cheapest and most
 * certain first, and everything past step three SUGGESTS rather than
 * resolves. A confident wrong answer here writes the wrong exercise into
 * somebody's week, which is worse than asking.
 */
export function resolveExercise(raw: string): Resolution {
  const trimmed = raw.trim()
  if (!trimmed) return { kind: 'unknown' }

  // 1. it is already an id
  if (EXERCISES[trimmed]) return { kind: 'resolved', id: trimmed, how: 'id' }

  const { key } = normalizeName(trimmed)
  if (!key) return { kind: 'unknown' }

  // 2. it is a catalog name, normalized
  const exact = CATALOG_KEYS.get(key)
  if (exact?.length === 1) return { kind: 'resolved', id: exact[0], how: 'name' }
  if (exact && exact.length > 1) return { kind: 'suggest', ids: exact }

  // 3 and 4. the alias table, which may be ambiguous on purpose
  const hits = ALIASES.filter((a) => a.key === key)
  const sure = hits.filter((a) => a.confidence >= CONFIRM_THRESHOLD)
  if (sure.length === 1) return { kind: 'resolved', id: sure[0].id, how: 'alias' }
  if (hits.length) {
    // Either several confident rows disagree about what this means, or the
    // best one sits below the bar. To the athlete those are the same
    // answer: here is what it might be, you pick.
    const ids = [...new Set([...hits].sort((a, b) => b.confidence - a.confidence).map((a) => a.id))]
    return { kind: 'suggest', ids }
  }

  // 5. fuzzy, top five, always a suggestion
  const scored = [...CATALOG_KEYS.entries()]
    .flatMap(([k, ids]) => ids.map((id) => ({ id, score: nameScore(key, k) })))
    .filter((c) => c.score >= SUGGEST_FLOOR)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 5)
  if (scored.length) return { kind: 'suggest', ids: scored.map((c) => c.id) }

  // 6. nothing honest to offer
  return { kind: 'unknown' }
}
