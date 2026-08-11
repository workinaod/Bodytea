// ============================================================
// Haptics. Trivial on the web, real on a phone: the native
// build swaps this for the OS taptic engine, which can do
// patterns the Vibration API cannot express.
//
// iOS Safari does not implement navigator.vibrate at all, so
// every call here is best-effort and nothing may depend on it.
// ============================================================

export function hapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

type Vibrator = Navigator & { vibrate?: (p: number | number[]) => boolean }

function buzz(pattern: number | number[]): void {
  try {
    ;(navigator as Vibrator).vibrate?.(pattern)
  } catch {
    /* never let a buzz break a session */
  }
}

/** A set is logged, a rep target hit. One short confirmation. */
export const tapConfirm = (): void => buzz(35)

/** Rest is over, get back under the bar. Impossible to miss in a gym. */
export const buzzRestOver = (): void => buzz([250, 120, 250])

/** Something went wrong and the screen may not be in view. */
export const buzzAlert = (): void => buzz([120, 80, 120, 80, 120])
