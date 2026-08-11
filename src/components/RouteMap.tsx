import { useMemo } from 'react'
import type { RunPoint } from '../types'
import { fitBounds, latToWorldY, lngToWorldX } from '../engine/runs'

/**
 * Slippy-map route view with zero dependencies: OSM raster tiles laid
 * as an <img> grid, the track drawn as an SVG polyline on top. Offline
 * (or with tiles blocked) the imgs simply don't paint and the route
 * still draws on the dark field, stats never depend on the map.
 *
 * Two modes:
 *   FOLLOW (live) locks the view on the runner at a chosen zoom, so the
 *     dot stays under your thumb and the streets around you are legible.
 *   FIT (review) frames the whole route once it exists.
 *
 * The tiles used to be run through opacity .55 / saturation .35, which
 * is why the map read as white and flat. They are close to their real
 * colours now, dimmed just enough to belong in a dark app: parks are
 * green, water is blue, and you can tell a park from a car park.
 */
export function RouteMap({
  points,
  height = 220,
  width = 480,
  live = false,
  follow = false,
  zoom: zoomProp,
}: {
  points: RunPoint[]
  height?: number
  width?: number
  live?: boolean
  /** Lock the view on the latest fix instead of framing the whole route. */
  follow?: boolean
  /** Zoom level for follow mode (14 wide … 18 street level). */
  zoom?: number
}) {
  const view = useMemo(() => {
    if (points.length < 1) return null
    let zoom: number
    let originX: number
    let originY: number

    if (follow) {
      // Centre on where they are now. The map moves under the dot rather
      // than the dot wandering around a fixed frame.
      zoom = zoomProp ?? 17
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
  }, [points, points.length, width, height, follow, zoomProp])

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
    <div className="relative h-full overflow-hidden rounded-2xl bg-[#0f1114] ring-1 ring-white/[0.07]" style={{ height }}>
      {/* Near-true colour, dimmed just enough for a dark app */}
      <div className="absolute inset-0 saturate-[1.1] brightness-[0.88] contrast-[1.04]">
        {view.tiles.map((t) => (
          <img
            key={`${view.zoom}/${t.x}/${t.y}`}
            src={`https://tile.openstreetmap.org/${view.zoom}/${t.x}/${t.y}.png`}
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
          <polyline
            points={view.path.join(' ')}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        )}
        {!view.single && (
          <circle cx={view.start.x} cy={view.start.y} r="5.5" fill="var(--color-lime)" stroke="#000" strokeWidth="1.5" />
        )}
        {/* You are here: the same blue dot everyone already understands */}
        <circle cx={view.end.x} cy={view.end.y} r="18" fill="var(--color-cyan)" opacity="0.22">
          {live && <animate attributeName="r" values="13;24;13" dur="2s" repeatCount="indefinite" />}
        </circle>
        <circle cx={view.end.x} cy={view.end.y} r="8" fill="var(--color-cyan)" stroke="#fff" strokeWidth="3" />
      </svg>
      <div className="absolute bottom-1 right-2 text-[8.5px] text-white/45">© OpenStreetMap</div>
    </div>
  )
}
