import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from './useBodyScrollLock'

/**
 * Bottom sheet with iOS-proof background scroll lock and
 * swipe-down-to-dismiss. `locked` removes every dismiss affordance
 * (SkipFlow, reconcile), dragging a locked sheet only rubber-bands.
 *
 * Touch handling uses native non-passive listeners (React's JSX touch
 * handlers are passive, so preventDefault would be ignored).
 */
export function Sheet({
  open,
  onClose,
  children,
  locked = false,
  title,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  locked?: boolean
  title?: string
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [dragY, setDragY] = useState(0)
  const dragYRef = useRef(0)
  const [dragging, setDragging] = useState(false)
  const lockedRef = useRef(locked)
  lockedRef.current = locked
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const setDrag = (y: number) => {
    dragYRef.current = y
    setDragY(y)
  }

  // ---- Background scroll lock (survives iOS rubber-banding) ----
  useBodyScrollLock(open)

  /**
   * Escape closes, and focus moves into the sheet and comes back out.
   *
   * The app is phone-first, so this went missing: on a touchscreen the
   * swipe and the X are the whole story. But it installs to a desktop
   * PWA too, and there a sheet was a keyboard dead end — nothing closed
   * it, and focus stayed on the button underneath, which is also what a
   * screen reader follows. `locked` still means locked: SkipFlow and the
   * reconcile gate are deliberately inescapable and Escape must not be a
   * back door around them.
   */
  useEffect(() => {
    if (!open) return
    const restoreTo = document.activeElement as HTMLElement | null
    // After the portal paints, so the node exists to receive focus.
    const raf = requestAnimationFrame(() => sheetRef.current?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) {
        e.stopPropagation()
        onCloseRef.current()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      // Only if focus is still inside the sheet being torn down; a close
      // that already moved focus somewhere deliberate keeps it there.
      if (restoreTo?.isConnected && sheetRef.current?.contains(document.activeElement)) {
        restoreTo.focus()
      }
    }
  }, [open])

  // ---- Native drag gesture ----
  useEffect(() => {
    if (!open) {
      setDrag(0)
      return
    }
    const el = sheetRef.current
    if (!el) return

    const state = { startY: 0, startedAt: 0, active: false, fromHandle: false }

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Dismiss-drag engages ONLY from the header/handle zone. Buttons in
      // the header (the X) must keep their taps, never capture them.
      if (target.closest('button')) return
      state.fromHandle = !!target.closest('[data-sheet-handle]')
      if (!state.fromHandle) return
      state.startY = e.touches[0].clientY
      state.startedAt = Date.now()
      state.active = true
      setDragging(true)
    }

    const onMove = (e: TouchEvent) => {
      if (!state.active) return
      const dy = e.touches[0].clientY - state.startY
      if (dy > 0) {
        e.preventDefault()
        setDrag(lockedRef.current ? Math.min(28, Math.sqrt(dy) * 3) : dy)
      } else {
        setDrag(0)
      }
    }

    const onEnd = () => {
      if (!state.active) return
      state.active = false
      setDragging(false)
      const dy = dragYRef.current
      if (lockedRef.current) {
        setDrag(0)
        return
      }
      const elapsed = Math.max(1, Date.now() - state.startedAt)
      if (dy > 120 || dy / elapsed > 0.55) onCloseRef.current()
      else setDrag(0)
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [open])

  if (!open) return null

  // Portalled to the body on purpose. `backdrop-blur` on this very
  // sheet creates a containing block, so ANY fixed overlay rendered
  // inside a sheet resolves against the sheet's box instead of the
  // screen. That is how the full-screen run tracker ended up as a
  // strip at the bottom of the cardio sheet.
  //
  // z-75 threads a narrow gap on purpose. Above FocusView (70), because
  // at z-50 a sheet opened from inside a session rendered BEHIND it and
  // "Can't finish" looked completely dead. Below the run tracker (80)
  // and the cardio timer (90), because those are full-screen takeovers
  // launched OVER a sheet, and lifting sheets above them instead left
  // the cardio sheet swallowing taps meant for "Finish run".
  return createPortal(
    <div className="fixed inset-0 z-[75] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        style={{ opacity: dragY > 0 ? Math.max(0.25, 1 - dragY / 400) : undefined }}
        onClick={locked ? undefined : onClose}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        {...(title ? { 'aria-labelledby': titleId } : { 'aria-label': 'Dialog' })}
        tabIndex={-1}
        className={`relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[30px] border-2 border-b-0 border-edge bg-surface outline-none pb-[max(env(safe-area-inset-bottom),16px)] ${
          dragY === 0 && !dragging ? 'animate-slide-up' : ''
        }`}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header / drag handle zone */}
        <div data-sheet-handle className="shrink-0 cursor-grab select-none px-5 pb-1 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
          <div className="flex items-center justify-between">
            {title ? (
              <h3 id={titleId} className="text-[17px] font-black tracking-tight">
                {title}
              </h3>
            ) : (
              <span />
            )}
            {!locked && (
              <button
                aria-label="Close"
                onClick={onClose}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onClose()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-edge bg-surface-2 text-ink-dim"
              >
                <svg viewBox="0 0 24 24" className="h-[14px] w-[14px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
