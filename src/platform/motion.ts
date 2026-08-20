// ============================================================
// Motion, in both senses the app needs: the device's own
// movement (step counting, below) and the user's stated
// tolerance for movement on screen (prefersReducedMotion).
// Both are platform capabilities, so both live here rather
// than in a component reaching for a browser API directly.
//
// Step counting from the accelerometer.
//
// Why this exists: a treadmill run moves the body and not the
// phone's position, so GPS reports zero distance for real work.
// Steps are the honest signal indoors. On the native build this
// adapter is replaced by the OS pedometer (CMPedometer / Health
// Connect), which is both cheaper and more accurate.
//
// The algorithm is deliberately conservative. It is better to
// undercount a treadmill mile than to award steps for a phone
// rattling in a cup holder.
// ============================================================

export function motionSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window
}

/**
 * Has the user asked the OS for less movement?
 *
 * The stylesheet already honours this for anything driven by CSS. This is
 * for the handful of effects JavaScript owns (count-ups, confetti, the
 * ceremony's timing), which have to answer the same question in code:
 * show the end state, skip the journey. Never treat a true here as
 * permission to hide INFORMATION, only motion.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

type MotionEventCtor = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/** iOS 13+ demands a user gesture before it will report motion at all. */
export async function requestMotionPermission(): Promise<boolean> {
  if (!motionSupported()) return false
  const ctor = window.DeviceMotionEvent as MotionEventCtor
  if (typeof ctor.requestPermission !== 'function') return true // Android/desktop
  try {
    return (await ctor.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

/**
 * Stride length in miles, from height. Walking strides run about 0.415 of
 * height and running strides about 0.55, which is the standard
 * pedometer approximation. Height in inches; the default is a 5'9" adult.
 */
export function strideMiles(heightIn: number | undefined, running: boolean): number {
  const h = heightIn && heightIn > 40 && heightIn < 90 ? heightIn : 69
  const inches = h * (running ? 0.55 : 0.415)
  return inches / 63360
}

export interface StepCounter {
  steps: () => number
  stop: () => void
}

/**
 * Start counting steps until stopped.
 *
 * Detection is peak-and-refractory on the magnitude of acceleration: a
 * step is a rise above a threshold after having dropped below it, and no
 * sooner than 250ms after the last one, which caps the counter at 240
 * steps per minute. That is above any real cadence and well below the
 * frequencies a shaking phone produces.
 */
export function startStepCounter(): StepCounter {
  let count = 0
  let armed = true
  let lastStepAt = 0
  // Gravity-tracking baseline, so the threshold follows orientation
  // instead of assuming the phone is held one particular way.
  let baseline = 9.81

  const onMotion = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x === null || a.y === null || a.z === null) return
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
    // Slow low-pass: the baseline is gravity plus posture, not the step.
    baseline += (mag - baseline) * 0.05
    const swing = mag - baseline

    const now = e.timeStamp || performance.now()
    if (armed && swing > STEP_THRESHOLD && now - lastStepAt > STEP_REFRACTORY_MS) {
      count++
      lastStepAt = now
      armed = false
    } else if (!armed && swing < STEP_THRESHOLD * 0.4) {
      // Must fall back through the band before another step can register.
      armed = true
    }
  }

  window.addEventListener('devicemotion', onMotion)
  return {
    steps: () => count,
    stop: () => window.removeEventListener('devicemotion', onMotion),
  }
}

/** m/s² above the gravity baseline that counts as a footfall. */
export const STEP_THRESHOLD = 1.4
/** Fastest credible cadence, 240 steps per minute. */
export const STEP_REFRACTORY_MS = 250
