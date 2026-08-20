import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../platform/motion'

// ============================================================
// A number that arrives instead of appearing.
//
// Only for numbers somebody EARNED: sets banked, pounds moved.
// A count-up on a number the user did not just produce is a
// loading spinner wearing a costume.
//
// Cubic ease-out, so most of the distance is covered early and
// the last few units settle. Linear counting reads mechanical.
// ============================================================

export function useCountUp(to: number, play: boolean, ms = 600): number {
  const [shown, setShown] = useState(play ? 0 : to)

  useEffect(() => {
    if (!play) {
      setShown(to)
      return
    }
    // Asked for calm: hand over the final number, skip the journey.
    if (prefersReducedMotion()) {
      setShown(to)
      return
    }
    let raf = 0
    let start = 0
    setShown(0)
    const step = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / ms)
      setShown(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, play, ms])

  return shown
}
