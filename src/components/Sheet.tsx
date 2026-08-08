import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Bottom sheet with iOS-proof background scroll lock and
 * swipe-down-to-dismiss. `locked` removes every dismiss affordance
 * (SkipFlow, reconcile) — dragging a locked sheet only rubber-bands.
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
  const scrollBodyRef = useRef<HTMLDivElement>(null)
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
  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    const body = document.body
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
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
      state.startY = e.touches[0].clientY
      state.startedAt = Date.now()
      state.fromHandle = !!target.closest('[data-sheet-handle]')
      state.active = true
      setDragging(true)
    }

    const onMove = (e: TouchEvent) => {
      if (!state.active) return
      const clientY = e.touches[0].clientY
      const dy = clientY - state.startY
      if (!state.fromHandle) {
        // From content: hijack only when the body is scrolled to the top
        // and the pull is downward; otherwise it's a normal scroll.
        const scroller = scrollBodyRef.current
        if (!scroller || scroller.scrollTop > 0 || dy <= 0) {
          state.startY = clientY // re-anchor so a later top-pull engages cleanly
          if (dragYRef.current !== 0) setDrag(0)
          return
        }
      }
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        style={{ opacity: dragY > 0 ? Math.max(0.25, 1 - dragY / 400) : undefined }}
        onClick={locked ? undefined : onClose}
      />
      <div
        ref={sheetRef}
        className={`relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-edge bg-bg pb-[max(env(safe-area-inset-bottom),16px)] ${
          dragY === 0 && !dragging ? 'animate-slide-up' : ''
        }`}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header / drag handle zone */}
        <div data-sheet-handle className="shrink-0 cursor-grab select-none bg-bg/95 px-5 pb-1 pt-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-edge" />
          <div className="flex items-center justify-between">
            {title ? <h3 className="text-[17px] font-black tracking-tight">{title}</h3> : <span />}
            {!locked && (
              <button
                onClick={onClose}
                className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-ink-dim"
              >
                Close
              </button>
            )}
          </div>
        </div>
        <div ref={scrollBodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2">
          {children}
        </div>
      </div>
    </div>
  )
}
