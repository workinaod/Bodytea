// ============================================================
// Turning written prescriptions into something a voice can say.
//
// The "sounds like a screen reader" problem is mostly this file's
// job, not the voice engine's. A synthesizer handed "Incline DB
// Press · 3 × 8-12 · 45 sec / side" says "incline dee bee press,
// three, ex, eight hyphen twelve, forty five sek slash side". No
// timbre fixes that. It has to be handed English.
//
// Pure string in, pure string out: captions keep showing the
// compact written form while the voice gets the spoken one.
// ============================================================

/** Gym shorthand, longest first so DB inside RDL is never hit early. */
const ABBREVIATIONS: [RegExp, string][] = [
  [/\bRFESS\b/gi, 'rear foot elevated split squat'],
  [/\bRDLs?\b/gi, 'Romanian deadlift'],
  [/\bCMJ\b/gi, 'countermovement jump'],
  [/\bOHP\b/gi, 'overhead press'],
  [/\bBSS\b/gi, 'Bulgarian split squat'],
  [/\bDB\b/gi, 'dumbbell'],
  [/\bBB\b/gi, 'barbell'],
  [/\bKB\b/gi, 'kettlebell'],
  [/\bMB\b/gi, 'medicine ball'],
  [/\bEZ[- ]?bar\b/gi, 'easy bar'],
  [/\bSL\b/g, 'single leg'],
  [/\bISO\b/gi, 'isometric'],
  [/\bAMRAP\b/gi, 'as many reps as possible'],
  [/\bRPE\b/gi, 'R P E'],
  [/\b1RM\b/gi, 'one rep max'],
  [/\bPR\b/g, 'personal record'],
  [/\bCNS\b/g, 'nervous system'],
]

/**
 * Units. Only expanded when a number is in front, so "in" the
 * preposition and "min" inside a word are left alone.
 */
const UNITS: [RegExp, string][] = [
  [/(\d)\s*yds?\b/gi, '$1 yards'],
  [/(\d)\s*secs?\b/gi, '$1 seconds'],
  [/(\d)\s*mins?\b/gi, '$1 minutes'],
  [/(\d)\s*hrs?\b/gi, '$1 hours'],
  [/(\d)\s*lbs?\b/gi, '$1 pounds'],
  [/(\d)\s*kgs?\b/gi, '$1 kilos'],
  [/(\d)\s*mi\b/gi, '$1 miles'],
  [/(\d)\s*km\b/gi, '$1 K'],
  [/(\d)\s*ft\b/gi, '$1 feet'],
  [/(\d)\s*in\b/gi, '$1 inches'],
  [/(\d)\s*cm\b/gi, '$1 centimetres'],
  [/(\d)\s*m\b/g, '$1 metres'],
  [/(\d)\s*g\b/g, '$1 grams'],
]

/** Is this word a quantity, so a slash after it means "per"? */
function isMeasure(word: string): boolean {
  return (
    /\d$/.test(word) ||
    /^(seconds?|minutes?|hours?|reps?|sets?|rounds?|yards?|metres?|meters?|miles?|pounds?|kilos?|feet|inches|steps?|times?|calories)$/i.test(
      word,
    )
  )
}

/**
 * Speak a written prescription the way a coach would read it aloud.
 *
 * Everything here is driven by real strings from the catalog:
 *   "Incline DB Press"      → "Incline dumbbell Press"
 *   "3 × 8-12"              → "3 by 8 to 12"
 *   "45 sec / side"         → "45 seconds per side"
 *   "30–40 yd"              → "30 to 40 yards"
 *   "Walk / hike"           → "Walk or hike"
 */
export function speakable(text: string): string {
  let s = text

  for (const [re, to] of ABBREVIATIONS) s = s.replace(re, to)

  // A dash BETWEEN NUMBERS is a range. Everywhere else it is a compound
  // word ("heels-elevated") and must survive untouched.
  s = s.replace(/(\d)\s*[-–—]\s*(?=\d)/g, '$1 to ')

  // "3 × 5" and "3x5" are set by rep counts.
  s = s.replace(/(\d)\s*[×x]\s*(?=\d)/gi, '$1 by ')

  for (const [re, to] of UNITS) s = s.replace(re, to)

  // A slash after a measurement is a rate ("45 seconds / side"); between
  // two plain words it is a choice ("dumbbell / barbell"). Only the word
  // immediately before the slash decides, because scanning the whole line
  // for a digit turns "Set 2: Walk / hike" into "walk per hike".
  s = s.replace(/(\S+)\s*\/\s*/g, (_m, before: string) => `${before}${isMeasure(before) ? ' per ' : ' or '}`)

  s = s
    .replace(/\s*@\s*/g, ' at ')
    .replace(/(\d)\s*%/g, '$1 percent')
    .replace(/\s*\+\s*/g, ' plus ')
    // Interpunct is a visual separator; spoken, it is a beat.
    .replace(/\s*·\s*/g, ', ')
    // A leftover en dash between words reads as a pause, not a word.
    .replace(/\s*[–—]\s*/g, ', ')

  return s.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Split a line into utterances the engine can shape separately.
 *
 * One long sentence with a colon in the middle gets a single flat
 * prosodic arc, which is a large part of why the coach sounds like it is
 * reading a form. Broken at its real boundaries, each piece gets its own
 * rise and fall and the gaps between them read as breathing.
 */
export function intoChunks(text: string): string[] {
  return text
    .split(/(?<=[.!?:])\s+|,\s+(?=[A-Z])/)
    .map((c) => c.trim())
    .filter(Boolean)
}
