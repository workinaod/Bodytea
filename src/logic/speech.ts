// ============================================================
// Speech in and out for the voice coach. Output is plain
// speechSynthesis (universal). Input is (webkit)SpeechRecognition
// — iOS Safari 14.5+/Chrome; absent → callers fall back to taps.
// ============================================================

export function speechOutSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Pick the most natural voice the device offers — Enhanced/Premium system
// voices first, then the known-warm names, never the flat robot default.
let chosenVoice: SpeechSynthesisVoice | null = null
let voicesHooked = false

function pickVoice(): void {
  try {
    const vs = window.speechSynthesis.getVoices()
    if (!vs.length) return
    const en = vs.filter((v) => v.lang.toLowerCase().startsWith('en'))
    const pool = en.length ? en : vs
    const score = (v: SpeechSynthesisVoice) =>
      (/enhanced|premium|natural|neural/i.test(v.name) ? 8 : 0) +
      (/samantha|ava|allison|zoe|susan|karen|serena|moira|nicky|google us english/i.test(v.name) ? 4 : 0) +
      (v.lang === 'en-US' ? 2 : 0) +
      (v.localService ? 1 : 0)
    chosenVoice = [...pool].sort((a, b) => score(b) - score(a))[0] ?? null
  } catch {
    /* keep default */
  }
}

export function say(text: string, opts?: { rate?: number; interrupt?: boolean }): void {
  if (!speechOutSupported()) return
  try {
    if (!voicesHooked) {
      voicesHooked = true
      pickVoice()
      window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
    }
    if (!chosenVoice) pickVoice()
    if (opts?.interrupt) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    if (chosenVoice) u.voice = chosenVoice
    // Slightly slower + a touch of pitch takes the edge off the delivery
    u.rate = opts?.rate ?? 0.9
    u.pitch = 1.04
    window.speechSynthesis.speak(u)
  } catch {
    /* never let audio kill the session */
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

export function cancelSpeech(): void {
  if (!speechOutSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* ignore */
  }
}

type RecognitionCtor = new () => {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechInSupported(): boolean {
  return recognitionCtor() !== null
}

// All the common ways people say it — matched on word boundaries.
const GO_RE = /\b(go|start|begin|ready|yes|yeah|yep|yup|run it|lessgo|less go|let'?s go|lets go|start set)\b/
const DONE_RE = /\b(done|finished|finish|next|got it|complete|that'?s it|i'?m done|im done)\b/
const SKIP_RE = /\b(skip( the)?( rest| break)?|pass)\b/
const ASK_RE = /\b(instructions?|how do i|how to|what is this|what'?s this|explain|show me how)\b/

export interface EarHandlers {
  onGo?: () => void
  onDone?: () => void
  onSkip?: () => void
  /** "how do I do this / instructions" — coach explains on request only. */
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
  rec.interimResults = false
  rec.lang = 'en-US'
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const heard = (e.results[i][0]?.transcript ?? '').toLowerCase()
      // ASK first ("how do I start this" must explain, not start), then
      // SKIP, then DONE, then GO — so "i'm done, start the timer"
      // resolves the completion first.
      if (ASK_RE.test(heard)) handlers.onAsk?.()
      else if (SKIP_RE.test(heard)) handlers.onSkip?.()
      else if (DONE_RE.test(heard)) handlers.onDone?.()
      else if (GO_RE.test(heard)) handlers.onGo?.()
    }
  }
  rec.onend = () => {
    if (!alive) return
    try {
      rec.start()
    } catch {
      /* restart can race — next onend retries */
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
