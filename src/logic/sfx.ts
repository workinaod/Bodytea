import { useAppStore } from '../store/appStore'
import { chord, tone } from '../platform/sound'

// ============================================================
// The six sounds, and what earns each one.
//
// Owner-approved palette, round 7. The brand is honest, short and a
// little hard, so none of these is a chime: low, physical, fast, and
// nothing above 350Hz except the one bright moment. The most-heard
// sound in the app is also the quietest, because it plays twenty-five
// times a session over the athlete's own music in a loud room.
//
// EVERY ONE IS GATED ON AN ENGINE EVENT, never on a tap happening.
// The fifth-up note fires on the rep target the plan set, not on any
// rep. The record sound fires on what detectPRs actually found. That
// is what keeps the day one of them fires for real worth hearing, and
// it is the whole difference from an app that celebrates everything.
//
// One switch governs all of them: settings.soundMode, which already
// existed with four values and was read by the countdown alone.
// ============================================================

/**
 * Silent means silent. Everything else hears the palette.
 *
 * The default follows the old voiceCoach flag, so an account that
 * never touched the setting keeps the behaviour it already had.
 */
function audible(): boolean {
  const s = useAppStore.getState().data.settings
  const mode = s.soundMode ?? ((s.voiceCoach ?? true) ? 'voice' : 'silent')
  return mode !== 'silent'
}

/** A set is on the record. A low wooden knock, the quietest thing here. */
export function sfxSetBanked(): void {
  if (!audible()) return
  tone({ f: 165, dur: 0.09, type: 'triangle', drop: 0.72, gain: 0.15 })
}

/**
 * The set hit the reps the plan asked for.
 *
 * The same knock a fifth up. You feel the difference before you can
 * name it, which is the point: it says that one counted for more
 * without spending a word or a pixel on saying so.
 */
export function sfxRepTarget(): void {
  if (!audible()) return
  tone({ f: 247, dur: 0.09, type: 'triangle', drop: 0.74, gain: 0.15 })
}

/** Rest is over. Two pulses under the triple buzz that already fires. */
export function sfxRestOver(): void {
  if (!audible()) return
  chord([
    { f: 140, dur: 0.1, type: 'triangle', drop: 0.8, gain: 0.18 },
    { f: 140, dur: 0.1, type: 'triangle', drop: 0.8, gain: 0.18, at: 0.14 },
  ])
}

/** A record the detector actually found. The only bright sound in the app. */
export function sfxRecord(): void {
  if (!audible()) return
  chord([
    { f: 220, dur: 0.16, type: 'triangle', gain: 0.15 },
    { f: 330, dur: 0.36, type: 'triangle', gain: 0.16, at: 0.1 },
  ])
}

/**
 * A streak day banked, under the flame.
 *
 * Slow attack on purpose. It does not announce, it catches, which is
 * the same thing the graphic it plays under is doing.
 */
export function sfxStreakDay(): void {
  if (!audible()) return
  chord([
    { f: 110, dur: 0.7, gain: 0.16, attack: 0.12 },
    { f: 165, dur: 0.5, gain: 0.06, attack: 0.16, at: 0.06 },
  ])
}

/**
 * The day is banked. The only fanfare in the app.
 *
 * It fires once a day, which is exactly why it still means something
 * in week six. A downgraded day gets it quieter rather than not at
 * all: the day went on the record either way, and saying so softly is
 * the honest version of saying so.
 */
export function sfxSessionDone(quiet = false): void {
  if (!audible()) return
  const g = quiet ? 0.09 : 0.16
  chord([
    { f: 175, dur: 0.16, type: 'triangle', gain: g },
    { f: 262, dur: 0.16, type: 'triangle', gain: g, at: 0.1 },
    { f: 349, dur: 0.3, type: 'triangle', gain: g, at: 0.2 },
  ])
}
