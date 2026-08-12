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
  onerror: (() => void) | null
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

export interface EarHandlers {
  onGo?: () => void
  onDone?: () => void
  onSkip?: () => void
  /** "how do I do this / instructions", coach explains on request only. */
  onAsk?: () => void
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
  rec.onend = () => {
    if (!alive) return
    // A restart begins a fresh result list from index 0, so the guard
    // has to go with it or the first command after every restart is
    // swallowed.
    lastFired = -1
    try {
      rec.start()
    } catch {
      /* restart can race, next onend retries */
    }
  }
  rec.onerror = () => {
    /* onend fires after; restart handles it */
  }
  try {
    rec.start()
  } catch {
    return () => {}
  }
  return () => {
    alive = false
    try {
      rec.stop()
    } catch {
      /* ignore */
    }
  }
}
