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

export type VoiceQuality = 'premium' | 'enhanced' | 'compact' | 'unknown'

/**
 * Apple stamps the tier into the voiceURI, never the name.
 *
 * This matters more than any scoring tweak: iOS ships ONLY the compact
 * cut of each voice out of the box, and compact is the robotic one. The
 * enhanced and premium cuts are a free download the user has to ask for
 * in Settings, and until they do, no amount of picking helps because
 * every candidate is the same low-fi engine.
 */
export function voiceQuality(v: SpeechSynthesisVoice): VoiceQuality {
  const uri = v.voiceURI ?? ''
  const name = v.name ?? ''
  if (/premium/i.test(uri) || /premium/i.test(name)) return 'premium'
  if (/enhanced|neural|natural/i.test(uri) || /enhanced|neural|natural/i.test(name)) return 'enhanced'
  if (/compact/i.test(uri)) return 'compact'
  return 'unknown'
}

/** The best tier this device can currently offer. */
export function bestQualityAvailable(all: SpeechSynthesisVoice[]): VoiceQuality {
  const en = all.filter((v) => (v.lang ?? '').toLowerCase().startsWith('en'))
  const pool = en.length ? en : all
  if (pool.some((v) => voiceQuality(v) === 'premium')) return 'premium'
  if (pool.some((v) => voiceQuality(v) === 'enhanced')) return 'enhanced'
  if (pool.some((v) => voiceQuality(v) === 'unknown')) return 'unknown'
  return 'compact'
}

export function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name ?? ''
  const uri = v.voiceURI ?? ''
  if (ELOQUENCE.test(name) || NOVELTY.test(name)) return -100

  let s = 0
  // Apple hides the good ones here; other engines do use the name.
  const q = voiceQuality(v)
  if (q === 'premium') s += 20
  else if (q === 'enhanced') s += 14
  // Compact is the tinny one. Anything else on the device beats it,
  // so this has to outweigh every other bonus combined.
  else if (q === 'compact') s -= 10
  void uri
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
export function pickVoice(
  all: SpeechSynthesisVoice[],
  preferredURI?: string,
): SpeechSynthesisVoice | null {
  if (!all.length) return null
  // An explicit choice always wins. Scoring is only a guess at taste.
  if (preferredURI) {
    const chosen = all.find((v) => v.voiceURI === preferredURI)
    if (chosen) return chosen
  }
  const en = all.filter((v) => (v.lang ?? '').toLowerCase().startsWith('en'))
  const pool = en.length ? en : all
  const best = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]
  // Everything scored as a joke voice: better to take the engine default.
  return best && scoreVoice(best) > -100 ? best : null
}

/**
 * The English voices this device can speak with, right now.
 *
 * Lives here rather than in the picker because reading
 * `speechSynthesis` is a platform API, and keeping every one of
 * those behind this folder is what makes a native wrapper a swap
 * rather than a rewrite.
 */
export function listEnglishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter((v) => (v.lang ?? '').toLowerCase().startsWith('en'))
}

/** The list arrives asynchronously on every browser that matters. */
export function onVoicesChanged(cb: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {}
  window.speechSynthesis.addEventListener('voiceschanged', cb)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb)
}
