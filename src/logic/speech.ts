// ============================================================
// Speech in and out for the voice coach. Output is plain
// speechSynthesis (universal). Input is (webkit)SpeechRecognition
// — iOS Safari 14.5+/Chrome; absent → callers fall back to taps.
// ============================================================

export function speechOutSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function say(text: string, opts?: { rate?: number; interrupt?: boolean }): void {
  if (!speechOutSupported()) return
  try {
    if (opts?.interrupt) window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = opts?.rate ?? 1
    window.speechSynthesis.speak(u)
  } catch {
    /* never let audio kill the session */
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
const GO_RE = /\b(go|start|begin|ready|run it|lessgo|less go|let'?s go|lets go|start set)\b/
const DONE_RE = /\b(done|finished|finish|next|got it|complete|that'?s it|i'?m done|im done)\b/
const SKIP_RE = /\b(skip( the)?( rest| break)?|pass)\b/

export interface EarHandlers {
  onGo?: () => void
  onDone?: () => void
  onSkip?: () => void
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
      // SKIP before DONE: "skip the rest" contains no done-word, but keep
      // the order deliberate anyway; GO last so "start" in a longer phrase
      // like "i'm done, start the timer" resolves the completion first.
      if (SKIP_RE.test(heard)) handlers.onSkip?.()
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
