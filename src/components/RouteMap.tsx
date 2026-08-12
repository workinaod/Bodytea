import { useEffect, useMemo, useRef, useState } from 'react'
import type { RunPoint } from '../types'
import { fitBounds, latToWorldY, lngToWorldX } from '../engine/runs'

/**
 * Slippy-map route view with zero dependencies: raster tiles laid as an
 * <img> grid, the track drawn as an SVG polyline on top. Offline (or
 * with tiles blocked) the imgs simply don't paint and the route still
 * draws on the dark field. Stats never depend on the map.
 *
 * The tiles are CARTO's `dark_nolabels`, not OSM standard. Standard OSM
 * is a reference map: it prints every house number, every bus stop, a
 * one-way arrow on every street. All of that is noise while you are
 * running, and it fought the app's black. This layer keeps the shapes
 * (roads, parks, water, coastline) and drops the text entirely, which
 * is what a tracker map is actually for.
 *
 * Three modes:
 *   FOLLOW (live) locks the view on the runner, so the dot stays under
 *     your thumb and the streets around you move instead.
 *   FIT (review) frames the whole route once it exists.
 *   PANNED (dragged) hands control to the user until they recentre.
 */

const TILE = (z: number, x: number, y: number) =>
  `https://basemaps.cartocdn.com/dark_nolabels/${z}/${x}/${y}@2x.png`

/** Deeper than OSM standard allowed, so you can get right down to the kerb. */
export const MAX_ZOOM = 20
export const MIN_ZOOM = 11

export function RouteMap({
  points,
  height = 220,
  width = 480,
  live = false,
  follow = false,
  zoom: zoomProp,
  pannable = false,
}: {
  points: RunPoint[]
  height?: number
  width?: number
  live?: boolean
  /** Lock the view on the latest fix instead of framing the whole route. */
  follow?: boolean
  /** Zoom level for follow mode. */
  zoom?: number
  /** Let a finger drag the map away from the runner. */
  pannable?: boolean
}) {
  // Drag offset in screen pixels. Non-zero means the user took over.
  const [pan, setPan] = useState<{ x: number; y: number } | null>(null)
  const panRef = useRef(pan)
  panRef.current = pan
  const boxRef = useRef<HTMLDivElement>(null)

  // Following again resets the offset, so the runner never ends up
  // hidden off-screen after a stray swipe.
  useEffect(() => {
    if (!pannable) setPan(null)
  }, [pannable])

  useEffect(() => {
    const el = boxRef.current
    if (!el || !pannable) return
    const s = { x: 0, y: 0, base: { x: 0, y: 0 }, active: false }
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      s.x = e.touches[0].clientX
      s.y = e.touches[0].clientY
      s.base = panRef.current ?? { x: 0, y: 0 }
      s.active = true
    }
    const move = (e: TouchEvent) => {
      if (!s.active || e.touches.length !== 1) return
      // The map owns this gesture once it starts, or the sheet behind
      // it scrolls out from under the finger.
      e.preventDefault()
      setPan({
        x: s.base.x + (e.touches[0].clientX - s.x),
        y: s.base.y + (e.touches[0].clientY - s.y),
      })
    }
    const end = () => {
      s.active = false
    }
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', end, { passive: true })
    el.addEventListener('touchcancel', end, { passive: true })
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
    }
  }, [pannable])

  const view = useMemo(() => {
    if (points.length < 1) return null
    let zoom: number
    let originX: number
    let originY: number

    if (follow) {
      zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomProp ?? 17))
      const last = points[points.length - 1]
      const scale = 256 * 2 ** zoom
      originX = lngToWorldX(last[1]) - width / 2 / scale
      originY = latToWorldY(last[0]) - height / 2 / scale
    } else {
      // One fix is enough for a map: synthesize a small bounds box around it
      // so the tiles load the neighborhood immediately, marker on the spot.
      const boundsPts: RunPoint[] =
        points.length >= 2
          ? points
          : [
              [points[0][0] - 0.0025, points[0][1] - 0.0025, 0],
              [points[0][0] + 0.0025, points[0][1] + 0.0025, 0],
            ]
      const fit = fitBounds(boundsPts, width, height)
      zoom = fit.zoom
      originX = fit.originX
      originY = fit.originY
    }

    const scale = 256 * 2 ** zoom
    // A drag shifts the world origin the opposite way, so the map
    // travels with the finger.
    if (pan) {
      originX -= pan.x / scale
      originY -= pan.y / scale
    }
    const tiles: { x: number; y: number; left: number; top: number }[] = []
    const maxTile = 2 ** zoom
    const x0 = Math.floor(originX * maxTile)
    const y0 = Math.floor(originY * maxTile)
    const x1 = Math.floor((originX + width / scale) * maxTile)
    const y1 = Math.floor((originY + height / scale) * maxTile)
    for (let tx = x0; tx <= x1; tx++) {
      for (let ty = y0; ty <= y1; ty++) {
        if (ty < 0 || ty >= maxTile) continue
        tiles.push({
          x: ((tx % maxTile) + maxTile) % maxTile,
          y: ty,
          left: tx * 256 - originX * scale,
          top: ty * 256 - originY * scale,
        })
      }
    }
    const px = (p: RunPoint) => ({
      x: (lngToWorldX(p[1]) - originX) * scale,
      y: (latToWorldY(p[0]) - originY) * scale,
    })
    const path = points.map((p) => {
      const { x, y } = px(p)
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`
    })
    return { zoom, tiles, path, start: px(points[0]), end: px(points[points.length - 1]), single: points.length < 2 }
    // points is mutated in place during live tracking, length is the
    // signal that a new fix landed, so it must be a dependency too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, points.length, width, height, follow, zoomProp, pan])

  if (!view) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-white/[0.045] text-[11.5px] text-ink-faint ring-1 ring-white/[0.05]"
        style={{ height }}
      >
        {live ? 'Waiting for GPS…' : 'No route recorded'}
      </div>
    )
  }

  return (
    <div
      ref={boxRef}
      className="relative h-full overflow-hidden rounded-2xl bg-[#0b0d10] ring-1 ring-white/[0.07]"
      style={{ height, touchAction: pannable ? 'none' : undefined }}
    >
      {/* A touch of lift on an already-dark layer, so parks and water
          still read as green and blue instead of going to mud. */}
      <div className="absolute inset-0 saturate-[1.25] brightness-[1.06] contrast-[1.02]">
        {view.tiles.map((t) => (
          <img
            key={`${view.zoom}/${t.x}/${t.y}`}
            src={TILE(view.zoom, t.x, t.y)}
            alt=""
            width={256}
            height={256}
            className="absolute max-w-none"
            style={{ left: t.left, top: t.top }}
            loading="lazy"
          />
        ))}
      </div>
      <svg className="absolute inset-0 h-full w-full">
        {/* The route so far, always drawn */}
        {!view.single && (
          <>
            <polyline
              points={view.path.join(' ')}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.22"
            />
            <polyline
              points={view.path.join(' ')}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.98"
            />
            <circle cx={view.start.x} cy={view.start.y} r="5.5" fill="var(--color-lime)" stroke="#000" strokeWidth="1.5" />
          </>
        )}
        {/* You are here: the same blue dot everyone already understands */}
        <circle cx={view.end.x} cy={view.end.y} r="18" fill="var(--color-cyan)" opacity="0.22">
          {live && <animate attributeName="r" values="13;24;13" dur="2s" repeatCount="indefinite" />}
        </circle>
        <circle cx={view.end.x} cy={view.end.y} r="8" fill="var(--color-cyan)" stroke="#fff" strokeWidth="3" />
      </svg>
      {pan && (
        <button
          onClick={() => setPan(null)}
          className="press absolute bottom-2 left-2 rounded-full bg-black/70 px-3 py-1.5 text-[11px] font-bold text-cyan ring-1 ring-white/15 backdrop-blur"
        >
          Recenter
        </button>
      )}
      <div className="absolute bottom-1 right-2 text-[8.5px] text-white/40">© OpenStreetMap © CARTO</div>
    </div>
  )
}
