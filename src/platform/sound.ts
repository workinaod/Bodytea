// ============================================================
// Tones, with an envelope.
//
// The app already had `beep()`: one sine, one gain step, no attack
// and no decay. A gain that jumps from 0 to full in a single frame
// is an impulse, and an impulse is a CLICK, which is most of why
// the 3-2-1 countdown sounds like a hearing test rather than a
// coach. Everything here ramps in and out, so a 90ms tone lands as
// a knock instead of a spike.
//
// This file knows nothing about BodyT. It takes a frequency and a
// shape and makes a noise. Which noise means what, and whether the
// athlete wants to hear it at all, is logic/sfx.ts.
// ============================================================

export interface ToneSpec {
  /** Hz at the attack. */
  f: number
  /** Seconds, attack to silence. */
  dur: number
  type?: OscillatorType
  /** Peak gain. Nothing here goes above 0.2: it plays over music. */
  gain?: number
  /** Seconds to reach peak. A short one is a knock, a long one catches. */
  attack?: number
  /** Multiply the frequency down over the first 90ms. This is what makes
   *  a tone read as an impact rather than a note. */
  drop?: number
  /** Seconds to wait before this tone starts, for two-note figures. */
  at?: number
}

let ctx: AudioContext | null = null

/**
 * The shared context, resumed if the browser parked it.
 *
 * Every mobile browser starts audio suspended until a gesture. Session
 * sounds all follow a tap, so by the time anything here plays there has
 * been one, and resume() succeeds.
 */
function audio(): AudioContext | null {
  try {
    type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
    if (!Ctor) return null
    ctx = ctx ?? new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** One tone. Never throws: audio is a garnish, never a blocker. */
export function tone(spec: ToneSpec): void {
  try {
    const c = audio()
    if (!c) return
    const t = c.currentTime + (spec.at ?? 0)
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = spec.type ?? 'sine'
    osc.frequency.setValueAtTime(spec.f, t)
    if (spec.drop) {
      osc.frequency.exponentialRampToValueAtTime(spec.f * spec.drop, t + Math.min(0.09, spec.dur))
    }
    const peak = spec.gain ?? 0.16
    const attack = spec.attack ?? 0.004
    // exponentialRamp cannot touch zero, so the floor is an inaudible
    // 0.0001 at both ends rather than silence.
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + spec.dur)
    osc.connect(g)
    g.connect(c.destination)
    osc.start(t)
    osc.stop(t + spec.dur + 0.03)
  } catch {
    /* a failed noise is not a failed set */
  }
}

/** A figure: several tones on one clock. */
export function chord(specs: ToneSpec[]): void {
  for (const s of specs) tone(s)
}
