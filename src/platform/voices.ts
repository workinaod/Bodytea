// ============================================================
// Choosing the least robotic voice a device offers.
//
// The trap this fixes: the old picker scored `name` for the words
// "enhanced" and "premium", but Apple does not put quality in the
// name. It puts it in the URI, as `.premium` / `.enhanced`
// suffixes, so on every Apple device the quality bonus never once
// fired and the flat default won by tie-break.
//
// The matching trap in the other direction: EVERY iOS voiceURI
// contains the word "compact", so the old novelty veto cannot
// simply be pointed at the URI or it would reject the entire
// catalogue and fall back to the default it was trying to avoid.
// Quality is read from the URI, novelty is vetoed by name.
// ============================================================

/** Apple's Eloquence voices are the literal 1990s screen-reader engine. */
const ELOQUENCE = /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i

/** Joke voices macOS ships. Any of these mid-set would be a bug report. */
const NOVELTY =
  /\b(albert|fred|zarvox|junior|whisper|bells|organ|cellos|bad news|good news|bahh|boing|bubbles|deranged|hysterical|pipe organ|trinoids|wobble|jester|superstar)\b/i

/** Voices that actually sound like a person reading. */
const WARM = /\b(samantha|ava|allison|zoe|susan|karen|serena|moira|nicky|tom|aaron|evan|nathan)\b/i

export function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name ?? ''
  const uri = v.voiceURI ?? ''
  if (ELOQUENCE.test(name) || NOVELTY.test(name)) return -100

  let s = 0
  // Apple hides the good ones here; other engines do use the name.
  if (/premium|enhanced|neural|natural/i.test(uri) || /premium|enhanced|neural|natural/i.test(name)) s += 12
  if (WARM.test(name)) s += 4
  if (/siri/i.test(uri) || /siri/i.test(name)) s += 6
  if (v.lang === 'en-US') s += 2
  // Local voices do not stall when the network does, which matters in a gym.
  if (v.localService) s += 1
  return s
}

/**
 * Best available English voice, or null to let the engine decide.
 *
 * Re-resolved on every utterance rather than cached once: a backgrounded
 * phone can come back with a different voice list, and a stale
 * SpeechSynthesisVoice handle is one of the ways the coach goes silent
 * mid-session with no error.
 */
export function pickVoice(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!all.length) return null
  const en = all.filter((v) => (v.lang ?? '').toLowerCase().startsWith('en'))
  const pool = en.length ? en : all
  const best = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
  // Everything scored as a joke voice: better to take the engine default.
  return best && scoreVoice(best) > -100 ? best : null
}
