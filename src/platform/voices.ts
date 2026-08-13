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
const WARM =
  /\b(samantha|ava|allison|zoe|susan|karen|serena|moira|nicky|tom|aaron|evan|nathan|jamie|jaime|tessa)\b/i

/**
 * The coach's shortlist.
 *
 * scoreVoice has always vetoed the joke voices, but the PICKER never
 * asked it: it listed every English voice the device reported, so the
 * first four rows on an iPhone were Albert, Bad News, Bahh and Bells —
 * a comedy voice, a funeral dirge, a sheep and a carillon — while
 * Samantha sat below the fold. The veto existed and nothing consulted it.
 *
 * These are the ones worth offering: natural-sounding, distinct from
 * each other, and spread across accents and registers so the choice is
 * a real choice rather than shades of the same voice. Samantha, Allison,
 * Nathan and Zoe are US, Jamie is British, Tessa South African, and
 * Nathan is the one male voice on the list.
 *
 * Spelled both ways on purpose. Apple's English voice is JAMIE; JAIME
 * is its Spanish one, so a device that ships either spelling in English
 * is matched, and the Spanish Jaime cannot reach the picker anyway
 * because everything upstream filters to en-*.
 */
export const COACH_VOICES = /\b(samantha|tessa|jamie|jaime|allison|nathan|zoe)\b/i

/**
 * The shortlist as names, in the order worth reading.
 *
 * Exists so the picker can name what is MISSING. A web app can only
 * speak with voices the device already has, and iOS ships exactly one
 * compact voice per English locale — Samantha for US, Tessa for ZA and
 * so on. Allison, Nathan, Zoe and Jamie are not shipped at all: they
 * exist only as Enhanced or Premium downloads.
 *
 * So on a stock iPhone most of this list is simply absent, the picker
 * shows two rows, and there is nothing on screen to explain why. That
 * reads as a broken app rather than an uninstalled voice.
 */
export const COACH_VOICE_NAMES = ['Samantha', 'Allison', 'Nathan', 'Zoe', 'Jamie', 'Tessa'] as const

/**
 * Bumped whenever COACH_VOICES changes.
 *
 * This is what actually retires a removed voice. A saved choice is a
 * device URI: the voice stays installed, so it keeps resolving, and it
 * kept speaking long after the picker stopped offering it. Refusing to
 * honour any un-shortlisted URI fixed that but broke the other half —
 * a voice deliberately chosen from the full device list is also not on
 * the shortlist, and it was being ignored too.
 *
 * So the stored choice is cleared ONCE, when the list it was made from
 * is no longer the list on offer. After that an explicit choice is
 * honoured whatever it is, which is what "explicit" should mean.
 */
export const COACH_VOICE_SET_VERSION = 2

/** Was this choice made against an older shortlist? */
export function voiceChoiceIsStale(storedVersion: number | undefined): boolean {
  return storedVersion !== COACH_VOICE_SET_VERSION
}

/**
 * Shortlisted voices this device does not have.
 *
 * Empty when NONE of them are present, which means this is not an Apple
 * device at all — Android and desktop have their own voices and the
 * fallback list already offers them. Listing six Apple voices as
 * "missing" there would be advice nobody can act on.
 */
export function missingCoachVoices(all: SpeechSynthesisVoice[]): string[] {
  const present = (name: string) => all.some((v) => new RegExp(`\\b${name}\\b`, 'i').test(v.name ?? ''))
  const here = COACH_VOICE_NAMES.filter(present)
  if (here.length === 0) return []
  // Jamie and Jaime are the same voice spelled two ways; either counts.
  return COACH_VOICE_NAMES.filter(
    (n) => !present(n) && !(n === 'Jamie' && present('Jaime')),
  )
}

/**
 * The shortlist, or an honest fallback.
 *
 * Hard-filtering would be wrong: these are Apple voices, and on Android
 * or a desktop browser none of them exist. Returning an empty picker
 * there would take the choice away from exactly the users who most need
 * one. So when the shortlist is empty, everything that is not a joke
 * voice comes back instead.
 */
export function coachVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const short = all.filter((v) => COACH_VOICES.test(v.name ?? ''))
  if (short.length) return short
  return all.filter((v) => scoreVoice(v) > -100)
}

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
  const en = all.filter((v) => (v.lang ?? '').toLowerCase().startsWith('en'))
  // Automatic picks from the SAME set the picker offers, by construction.
  //
  // The first attempt at this gave shortlisted names a +12 score bonus and
  // hoped that was enough. It is not, and a mutation test caught it: an
  // enhanced Ava scores 21 against a compact Samantha's 9, so "Reset to
  // automatic" handed back a voice the picker deliberately refuses to
  // show. A score nudge cannot express set membership, so this does not
  // try to. Quality still decides WITHIN the set, which is what scoring
  // is actually for.
  const pool = coachVoices(en.length ? en : all)

  // An explicit choice wins, whatever it is, as long as the voice is
  // still installed. Retiring a removed voice is COACH_VOICE_SET_VERSION's
  // job: it clears the stale setting once, at the source, rather than
  // second-guessing every choice here forever. Doing it here instead
  // also silently overrode voices picked from the full device list,
  // which are legitimate and equally un-shortlisted.
  if (preferredURI) {
    const chosen = all.find((v) => v.voiceURI === preferredURI)
    if (chosen) return chosen
  }

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

/**
 * Kick the speech engine so it publishes its full voice list.
 *
 * iOS hands back a short list — often just the default per locale —
 * until the synthesiser has actually been used once. Downloaded
 * Enhanced and Premium voices are missing from that first read, which
 * is why a phone with them installed still showed two rows and a
 * message insisting they were not there.
 *
 * Silent on purpose: volume 0, one space. This has to be able to run
 * while the user is looking at Settings without the coach barking.
 * Skipped when speech is already in flight, so it can never clip a
 * live session's audio.
 */
export function primeVoiceList(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch {
    /* a failed prime just means the list stays as short as it was */
  }
}

/**
 * The English voices, and every later revision of that list.
 *
 * A single read at mount is not enough on any platform and is badly
 * wrong on iOS: `voiceschanged` is the documented signal, but a
 * standalone PWA frequently never fires it, so subscribing alone can
 * leave the picker showing whatever the first synchronous read
 * happened to catch — sometimes nothing at all.
 *
 * So this does all three: read now, subscribe, and re-read on a short
 * decaying schedule while the engine warms up. The callback only fires
 * when the list actually GREW, so a late empty read cannot wipe a
 * populated picker.
 */
export function watchVoices(cb: (voices: SpeechSynthesisVoice[]) => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {}
  let alive = true
  let seen = -1

  const read = () => {
    if (!alive) return
    const v = listEnglishVoices()
    if (v.length > seen) {
      seen = v.length
      cb(v)
    }
  }

  read()
  const off = onVoicesChanged(read)
  // Front-loaded, then spaced out: most devices are ready within a few
  // hundred milliseconds, and the late checks are for the slow ones
  // rather than a poll that runs forever.
  const timers = [80, 250, 600, 1200, 2000, 3500].map((ms) => setTimeout(read, ms))

  return () => {
    alive = false
    off()
    timers.forEach(clearTimeout)
  }
}
