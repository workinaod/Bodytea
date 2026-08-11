import { useEffect } from 'react'

/**
 * iOS-proof background scroll lock for full-screen overlays and sheets.
 * Freezes the body in place while `active`, restores scroll on release.
 * Without this, touch scrolling inside a fixed overlay chains to the
 * page behind it once the inner scroller hits an edge, and the whole
 * screen appears to shift or shrink.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
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
  }, [active])
}
