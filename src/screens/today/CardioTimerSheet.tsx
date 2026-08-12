import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ISODate } from '../../types'
import { cardioActivity } from '../../plan/cardio'
import { logCardio } from '../../logic/actions'
import { Btn } from '../../components/ui'

/**
 * Timed tracker for any cardio that isn't a GPS run/ride: pick it from
 * Track, hit start, work. Finish logs it as today's cardio. Heart rate
 * and calories join when wearables do.
 */
export function CardioTimerSheet({
  activityId,
  date,
  onClose,
  customLabel,
}: {
  activityId: string
  date: ISODate
  onClose: () => void
  /** What the user called it, when they named it themselves. */
  customLabel?: string
}) {
  const base = cardioActivity(activityId)
  // A session someone named "Padel" should say Padel everywhere, not
  // "Custom", or the Record reads as a list of anonymous blanks.
  const def = customLabel ? { ...base, label: customLabel } : base
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [saved, setSaved] = useState(false)
  const wakeRef = useRef<{ release?: () => Promise<void> } | null>(null)

  useEffect(() => {
    if (startedAt === null) return
    const id = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 1000)
    type WakeNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    void (navigator as WakeNav).wakeLock
      ?.request('screen')
      .then((s) => {
        wakeRef.current = s
      })
      .catch(() => {})
    return () => {
      clearInterval(id)
      void wakeRef.current?.release?.()
    }
  }, [startedAt])

  const mm = Math.floor(elapsed / 60)
  const ss = String(Math.floor(elapsed % 60)).padStart(2, '0')

  function finish() {
    const minutes = Math.max(1, Math.round(elapsed / 60))
    logCardio(date, { activityId: def.id, label: def.label, when: 'solo', minutes })
    setSaved(true)
  }

  // Portalled to the body, above the session UI. Rendered in place it
  // competed with FocusView's own stacking context instead of sitting
  // over it, so a live session's close button painted straight through
  // this screen and you got two X buttons and a buried title.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-bg px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),14px)]">
      <div className="flex items-center justify-between py-1">
        <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-ink-dim">
          {def.emoji} {def.label}
        </div>
        {(startedAt === null || saved) && (
          <button
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07] text-ink-dim"
          >
            <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {saved ? (
          <>
            <div className="text-[12px] font-black uppercase tracking-[0.2em] text-lime">Logged ✓</div>
            <div className="mt-3 font-display text-[64px] font-bold leading-none tabular-nums">
              {mm}:{ss}
            </div>
            <p className="mt-2 text-[13px] text-ink-dim">Counts as today's cardio.</p>
            <Btn kind="lime" className="mt-8 w-full max-w-xs" onClick={onClose}>
              Done
            </Btn>
          </>
        ) : startedAt === null ? (
          <>
            <div className="text-[64px]">{def.emoji}</div>
            <p className="mt-3 text-[13.5px] text-ink-dim">Timer starts when you do.</p>
            <Btn kind="lime" className="mt-8 w-full max-w-xs py-4 text-[15px]" onClick={() => setStartedAt(Date.now())}>
              Start {def.label.toLowerCase()}
            </Btn>
          </>
        ) : (
          <>
            <div className="font-display text-[84px] font-bold leading-none tabular-nums">
              {mm}:{ss}
            </div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
              recording, screen stays on
            </div>
            <Btn kind="lime" className="mt-10 w-full max-w-xs py-4 text-[15px]" onClick={finish}>
              Finish
            </Btn>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
