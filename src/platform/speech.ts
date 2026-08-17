import { intoChunks, speakable } from './speakable'
import { pickVoice } from './voices'

/**
 * The user's chosen voice, set from Settings. Kept as a module value
 * rather than read from the store, because this layer must not import
 * upwards into the app.
 */
let preferredVoiceURI: string | undefined
export function setPreferredVoice(uri: string | undefined): void {
  preferredVoiceURI = uri
}

// ============================================================
// Speech in and out, behind one adapter.
//
// Output is speechSynthesis, input is (webkit)SpeechRecognition.
// Both are web APIs a native wrapper would provide differently, so
// nothing above this file touches either of them directly.
//
// The sequencer here exists because speechSynthesis is not a queue
// you can trust. Two documented behaviours drive the design:
//   - cancel() then speak() in the same tick clips the first
//     200-300ms on iOS, which is exactly the exercise name
//   - onend does not always fire, so a queue that waits for it
//     deadlocks and the coach goes silent for the rest of the set
// ============================================================

export function speechOutSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// ---- The utterance queue ----

interface Chunk {
  text: string
  rate: number
}

let queue: Chunk[] = []
let speaking = false
let watchdog: ReturnType<typeof setTimeout> | null = null
let generation = 0

/**
 * True while the coach itself is talking.
 *
 * The microphone needs this: GO_RE matches "go" and "ready", and the
 * set intro ends "Tap go or tell me when you're ready", so at gym
 * volume the speaker feeds the mic and the coach starts its own
 * countdown. DONE_RE matches "next" and the rest line says "Rest.
 * Next: ...", so it also dismisses its own rest timer.
 */
export function isSpeaking(): boolean {
  return speaking
}

function clearWatchdog(): void {
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
}

/** Rough spoken duration, used only to size the watchdog. */
function estimateMs(text: string, rate: number): number {
  const words = text.split(/\s+/).length
  return Math.max(1200, (words / (2.8 * rate)) * 1000 + 700)
}

function drain(gen: number): void {
  if (gen !== generation) return
  const next = queue.shift()
  if (!next) {
    speaking = false
    return
  }
  speaking = true

  let handedOff = false
  const advance = () => {
    if (handedOff || gen !== generation) return
    handedOff = true
    clearWatchdog()
    // A real gap between utterances. Back to back, the engine runs them
    // together and the line reads as one breathless sentence.
    setTimeout(() => drain(gen), 140)
  }

  try {
    const u = new SpeechSynthesisUtterance(next.text)
    const voice = pickVoice(window.speechSynthesis.getVoices(), preferredVoiceURI)
    if (voice) {
      u.voice = voice
      // Following the voice rather than hardcoding en-US: a mismatch makes
      // some engines fall back to their default voice silently.
      u.lang = voice.lang
    } else {
      u.lang = 'en-US'
    }
    u.rate = next.rate
    u.pitch = 1.0
    u.onend = advance
    u.onerror = advance
    // onend is unreliable on iOS. Without this the queue deadlocks and
    // the coach is silent for the rest of the session.
    watchdog = setTimeout(advance, estimateMs(next.text, next.rate) * 1.6)
    window.speechSynthesis.speak(u)
  } catch {
    advance()
  }
}

/**
 * Say something.
 *
 * The text is normalised into speech ("DB" → "dumbbell", "8-12" → "8 to
 * 12") and split at its real sentence boundaries so each part gets its
 * own intonation instead of one flat arc across a colon.
 */
export function say(text: string, opts?: { rate?: number; interrupt?: boolean }): void {
  if (!speechOutSupported()) return
  try {
    const rate = opts?.rate ?? 1.0
    const chunks = intoChunks(speakable(text)).map((t) => ({ text: t, rate }))
    if (!chunks.length) return

    if (opts?.interrupt) {
      // Everything queued belongs to the moment we are interrupting.
      generation++
      queue = chunks
      clearWatchdog()
      window.speechSynthesis.cancel()
      speaking = true
      const gen = generation
      // NOT the same tick as cancel(): that is the clipping bug.
      setTimeout(() => drain(gen), 90)
      return
    }

    queue.push(...chunks)
    if (!speaking) drain(generation)
  } catch {
    /* never let audio kill the session */
  }
}

export function cancelSpeech(): void {
  if (!speechOutSupported()) return
  try {
    // Bump the generation first so any in-flight callback is orphaned,
    // otherwise a late onend restarts a queue we just emptied.
    generation++
    queue = []
    speaking = false
    clearWatchdog()
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

// ---- Beeps (Web Audio, lazy) ----

let audioCtx: AudioContext | null = null

export function beep(freq = 880, ms = 140, gain = 0.15): void {
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
    if (!Ctor) return
    audioCtx = audioCtx ?? new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    const osc = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    osc.frequency.value = freq
    osc.type = 'sine'
    g.gain.value = gain
    osc.connect(g)
    g.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + ms / 1000)
  } catch {
    /* audio is a garnish, never a blocker */
  }
}

// ---- Listening ----

type RecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void)
    | null
  onend: (() => void) | null
  // The error CODE was being thrown away, and it is the whole difference
  // between "try again in a moment" and "this will never work, stop".
  onerror: ((e: { error?: string }) => void) | null
  start: () => void
  stop: () => void
}

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechInSupported(): boolean {
  return recognitionCtor() !== null
}

// All the common ways people say it, matched on word boundaries.
export const GO_RE =
  /\b(go|start|begin|ready|yes|yeah|yep|yup|run it|lessgo|less go|let'?s go|lets go|start set)\b/
export const DONE_RE = /\b(done|finished|finish|next|got it|complete|that'?s it|i'?m done|im done)\b/
export const SKIP_RE = /\b(skip( the)?( rest| break)?|pass)\b/
export const ASK_RE =
  /\b(instructions?|how do i|how to|what is this|what'?s this|explain|show me how)\b/

/**
 * What the microphone is actually doing.
 *
 *   listening   - hearing you, commands work
 *   unavailable - something else holds the audio route. Music or a
 *                 video playing is the common one: iOS gives the route
 *                 to that app and a web page cannot ask to share it.
 *                 A native app declares .playAndRecord with
 *                 .mixWithOthers and keeps listening; Safari has no
 *                 equivalent, so this is reported, not fixed.
 *   denied      - no permission. Never coming back this session.
 */
export type EarStatus = 'listening' | 'unavailable' | 'denied'

export interface EarHandlers {
  onGo?: () => void
  onDone?: () => void
  onSkip?: () => void
  /** "how do I do this / instructions", coach explains on request only. */
  onAsk?: () => void
  /**
   * Told whenever the microphone changes state.
   *
   * Exists because the failure used to be silent: recognition died, the
   * restart loop span, and the screen went on looking like it was
   * listening while somebody repeated "done" at a phone that could not
   * hear them.
   */
  onStatus?: (status: EarStatus) => void
}

/**
 * Start continuous listening with auto-restart (recognizers stop
 * themselves after silence). Returns a stop() that really stops.
 */
export function startEars(handlers: EarHandlers): () => void {
  const Ctor = recognitionCtor()
  if (!Ctor) return () => {}
  let alive = true
  const rec = new Ctor()
  rec.continuous = true
  // Interim results are the whole difference between "done" landing now
  // and landing a second and a half later. A final result is only
  // emitted once the recognizer decides the utterance is OVER, which
  // means waiting out the trailing silence. Mid-set that pause reads as
  // the app ignoring you. The words we listen for are short and
  // distinct, so the first interim that contains one is already enough.
  rec.interimResults = true
  rec.lang = 'en-US'
  // Each utterance keeps a stable index in `e.results`, and interims for
  // it keep arriving after we have acted. Without this an utterance
  // fires once per interim and again on the final.
  let lastFired = -1
  rec.onresult = (e) => {
    // The coach's own voice comes back through the mic at gym volume, and
    // its lines contain the trigger words. Anything heard while it is
    // talking is discarded rather than obeyed.
    if (isSpeaking()) return
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (i <= lastFired) continue
      const heard = (e.results[i][0]?.transcript ?? '').toLowerCase()
      // ASK first ("how do I start this" must explain, not start), then
      // SKIP, then DONE, then GO, so "i'm done, start the timer"
      // resolves the completion first.
      let hit = true
      if (ASK_RE.test(heard)) handlers.onAsk?.()
      else if (SKIP_RE.test(heard)) handlers.onSkip?.()
      else if (DONE_RE.test(heard)) handlers.onDone?.()
      else if (GO_RE.test(heard)) handlers.onGo?.()
      else hit = false
      if (hit) lastFired = i
    }
  }
  // Consecutive failed restarts. A recognizer that cannot get the mic
  // ends immediately, so restarting on every onend was a tight loop:
  // hundreds of start/end cycles a minute, burning battery mid-session
  // to achieve nothing. Backing off keeps trying — music stops, calls
  // end, routes come back — without spinning while it cannot work.
  let strikes = 0
  let retry: ReturnType<typeof setTimeout> | null = null
  let dead = false
  let reported: EarStatus | null = null

  const report = (s: EarStatus) => {
    if (reported === s) return
    reported = s
    handlers.onStatus?.(s)
  }

  const restart = () => {
    if (!alive || dead) return
    // A restart begins a fresh result list from index 0, so the guard
    // has to go with it or the first command after every restart is
    // swallowed.
    lastFired = -1
    try {
      rec.start()
    } catch {
      /* start can race with a stop still settling; the backoff retries */
    }
  }

  rec.onend = () => {
    if (!alive || dead) return
    // 0.3s, 0.6s, 1.2s … capped at 8s. Long enough to stop thrashing,
    // short enough that the ears come back on their own the moment the
    // audio route frees up.
    const wait = Math.min(8000, 300 * 2 ** Math.min(strikes, 5))
    retry = setTimeout(restart, strikes === 0 ? 0 : wait)
  }

  rec.onerror = (e) => {
    const code = e?.error ?? ''
    if (code === 'not-allowed' || code === 'service-not-allowed') {
      // Permission, not luck. Retrying forever cannot change this and
      // the user needs to be told rather than left talking to nothing.
      dead = true
      report('denied')
      return
    }
    // no-speech is the normal end of a quiet stretch, not a fault, and
    // counting it would slowly back the ears off during a long set.
    if (code !== 'no-speech') {
      strikes++
      // One failure is a blip. A run of them means something else has
      // the microphone, which on a phone is nearly always media
      // playing in another app.
      if (strikes >= 3) report('unavailable')
    }
  }

  rec.onresult = ((original) => (e: Parameters<NonNullable<typeof rec.onresult>>[0]) => {
    // Anything heard at all proves the route is back.
    strikes = 0
    report('listening')
    original?.(e)
  })(rec.onresult)

  try {
    rec.start()
    report('listening')
  } catch {
    report('unavailable')
    return () => {}
  }
  return () => {
    alive = false
    if (retry) clearTimeout(retry)
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
  }
}
