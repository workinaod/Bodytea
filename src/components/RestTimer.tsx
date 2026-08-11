import { useEffect, useRef, useState } from 'react'
import { buzzRestOver } from '../platform/haptics'

/**
 * Timestamp-based rest timer, survives backgrounding (iOS throttles
 * intervals; we always recompute remaining from the wall clock).
 */
export function RestTimer({ seconds, onDismiss }: { seconds: number; onDismiss: () => void }) {
  const endsAt = useRef(Date.now() + seconds * 1000)
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt.current - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        try {
          buzzRestOver()
        } catch {
          /* no vibration support */
        }
      }
    }
    tick()
    const id = setInterval(tick, 500)
    const onVis = () => tick()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const mm = Math.floor(remaining / 60)
  const ss = String(remaining % 60).padStart(2, '0')
  const done = remaining === 0

  return (
    <button
      onClick={onDismiss}
      className={`fixed bottom-[86px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border px-5 py-2.5 shadow-2xl backdrop-blur transition-colors ${
        done ? 'border-lime/40 bg-lime/15 text-lime' : 'border-accent/40 bg-bg/90 text-accent-soft'
      }`}
    >
      <span className="text-[13px] font-bold uppercase tracking-wider">{done ? 'GO' : 'Rest'}</span>
      <span className="font-mono text-xl font-black tabular-nums">{mm}:{ss}</span>
      <span className="text-[11px] font-semibold text-ink-faint">{done ? 'tap to clear' : 'tap to skip'}</span>
    </button>
  )
}
