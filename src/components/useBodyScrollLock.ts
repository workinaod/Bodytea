import { useEffect } from 'react'

/**
 * Background scroll lock for full-screen overlays and sheets.
 *
 * The old version pinned the body with `position: fixed; top: -scrollY`.
 * That works on desktop and misbehaves on iOS: the offset leaks into
 * the layout, so every sheet floated above the bottom of the screen by
 * roughly however far the page happened to be scrolled. The gap moved
 * around because the scroll position did.
 *
 * This locks scrolling without moving anything. `overflow: hidden` on
 * the root stops the page scrolling, and `overscroll-behavior: contain`
 * on the sheet's own scroller (plus `overscroll-behavior-y: none` on
 * the body) is what actually stops a flick inside the sheet chaining
 * to the page behind it, which is the problem the body pinning was
 * really there to solve.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      touch: html.style.getPropertyValue('touch-action'),
    }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      if (prev.touch) html.style.setProperty('touch-action', prev.touch)
    }
  }, [active])
}
