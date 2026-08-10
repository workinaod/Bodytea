import { useMemo } from 'react'
import type { RunPoint } from '../types'
import { fitBounds, latToWorldY, lngToWorldX } from '../engine/runs'

/**
 * Slippy-map route view with zero dependencies: OSM raster tiles laid
 * as an <img> grid, the track drawn as an SVG polyline on top. Offline
 * (or with tiles blocked) the imgs simply don't paint and the route
 * still draws on the dark field — stats never depend on the map.
 */
export function RouteMap({
  points,
  height = 220,
  width = 480,
  live = false,
}: {
  points: RunPoint[]
  height?: number
  width?: number
  live?: boolean
}) {
  const view = useMemo(() => {
    if (points.length < 2) return null
    const { zoom, originX, originY } = fitBounds(points, width, height)
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
    return { zoom, tiles, path, start: px(points[0]), end: px(points[points.length - 1]) }
  }, [points, width, height])

  if (!view) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-edge/80 bg-surface text-[11.5px] text-ink-faint"
        style={{ height }}
      >
        {live ? 'Waiting for GPS movement…' : 'No route recorded'}
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-edge/80 bg-surface" style={{ height }}>
      <div className="absolute inset-0 opacity-[0.55] saturate-[0.35] brightness-[0.62] contrast-[1.05]">
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
        <polyline
          points={view.path.join(' ')}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={view.start.x} cy={view.start.y} r="5" fill="var(--color-lime)" stroke="#000" strokeWidth="1.5" />
        <circle cx={view.end.x} cy={view.end.y} r="5" fill="var(--color-accent)" stroke="#000" strokeWidth="1.5" />
      </svg>
      <div className="absolute bottom-1 right-2 text-[8.5px] text-ink-faint/70">© OpenStreetMap</div>
    </div>
  )
}
