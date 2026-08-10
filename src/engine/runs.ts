import type { AppData, ISODate, RunLog, RunPoint } from '../types'
import { addDaysISO, mondayOf } from './calendar'

// ============================================================
// GPS run/ride math — all pure. Points are [lat, lng, elapsedSec].
// Distance via haversine with junk-fix filtering; pace, splits,
// and weekly mileage for the Progress chart. Also the Web
// Mercator projection the route map draws with.
// ============================================================

const R_MI = 3958.7613

export function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R_MI * Math.asin(Math.sqrt(a))
}

/**
 * Should this GPS fix be kept? Rejects low-accuracy fixes, teleports
 * (> 45 mph between fixes — nobody runs or city-bikes that), and
 * jitter when standing still (< ~8 m of movement).
 */
export function acceptFix(
  prev: RunPoint | null,
  lat: number,
  lng: number,
  elapsedSec: number,
  accuracyM: number,
): boolean {
  if (accuracyM > 50) return false
  if (!prev) return true
  const dt = elapsedSec - prev[2]
  if (dt <= 0) return false
  const dMi = haversineMi(prev[0], prev[1], lat, lng)
  if ((dMi / dt) * 3600 > 45) return false
  return dMi >= 0.005 || dt >= 20
}

export function totalDistanceMi(points: RunPoint[]): number {
  let mi = 0
  for (let i = 1; i < points.length; i++) {
    mi += haversineMi(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
  }
  return Math.round(mi * 100) / 100
}

/** Seconds per mile (0 when there's no distance yet). */
export function paceSecPerMi(distanceMi: number, durationSec: number): number {
  if (distanceMi < 0.02) return 0
  return Math.round(durationSec / distanceMi)
}

export function fmtPace(secPerMi: number): string {
  if (!secPerMi) return '—'
  const m = Math.floor(secPerMi / 60)
  const s = Math.round(secPerMi % 60)
  return `${m}:${String(s).padStart(2, '0')}/mi`
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** Speed in mph — the natural stat for rides. */
export function avgMph(distanceMi: number, durationSec: number): number {
  if (durationSec <= 0) return 0
  return Math.round((distanceMi / (durationSec / 3600)) * 10) / 10
}

/** Time (sec) for each completed mile. */
export function mileSplits(points: RunPoint[]): number[] {
  const splits: number[] = []
  let mi = 0
  let nextMark = 1
  let lastMarkTime = 0
  for (let i = 1; i < points.length; i++) {
    mi += haversineMi(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    if (mi >= nextMark) {
      splits.push(Math.round(points[i][2] - lastMarkTime))
      lastMarkTime = points[i][2]
      nextMark++
    }
  }
  return splits
}

/** Thin a track for storage: keep every fix that adds shape, cap the count. */
export function compressTrack(points: RunPoint[], maxPoints = 600): RunPoint[] {
  if (points.length <= maxPoints) return points
  const step = Math.ceil(points.length / maxPoints)
  const out = points.filter((_, i) => i % step === 0)
  if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1])
  return out
}

/** Weekly mileage (runs + rides separately reported) for the last N weeks. */
export function weeklyMiles(
  data: AppData,
  todayISO: ISODate,
  weeks = 12,
): { date: ISODate; value: number }[] {
  const start = mondayOf(addDaysISO(todayISO, -7 * (weeks - 1)))
  const byWeek = new Map<string, number>()
  for (const r of data.runs) {
    const wk = mondayOf(r.date)
    if (wk < start) continue
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + r.distanceMi)
  }
  const out: { date: ISODate; value: number }[] = []
  for (let w = 0; w < weeks; w++) {
    const wk = addDaysISO(start, w * 7)
    if (wk > todayISO) break
    out.push({ date: wk, value: Math.round((byWeek.get(wk) ?? 0) * 10) / 10 })
  }
  return out
}

/** Build the final log from a recorded track. */
export function buildRunLog(
  id: string,
  activity: RunLog['activity'],
  date: ISODate,
  startedAt: string,
  durationSec: number,
  points: RunPoint[],
): RunLog {
  const distanceMi = totalDistanceMi(points)
  return {
    id,
    activity,
    date,
    startedAt,
    durationSec: Math.round(durationSec),
    distanceMi,
    avgPaceSec: paceSecPerMi(distanceMi, durationSec),
    splits: mileSplits(points),
    points: compressTrack(points),
  }
}

// ---------- Web Mercator (slippy map) projection ----------

export function lngToWorldX(lng: number): number {
  return (lng + 180) / 360
}

export function latToWorldY(lat: number): number {
  const rad = (lat * Math.PI) / 180
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2
}

/**
 * Fit a lat/lng bounding box into a pixel viewport: returns the zoom
 * and the world-coordinate origin of the viewport's top-left corner.
 */
export function fitBounds(
  points: RunPoint[],
  widthPx: number,
  heightPx: number,
  paddingPx = 24,
): { zoom: number; originX: number; originY: number } {
  const lats = points.map((p) => p[0])
  const lngs = points.map((p) => p[1])
  const minX = lngToWorldX(Math.min(...lngs))
  const maxX = lngToWorldX(Math.max(...lngs))
  const minY = latToWorldY(Math.max(...lats))
  const maxY = latToWorldY(Math.min(...lats))
  const spanX = Math.max(maxX - minX, 1e-7)
  const spanY = Math.max(maxY - minY, 1e-7)
  let zoom = 17
  for (; zoom > 2; zoom--) {
    const scale = 256 * 2 ** zoom
    if (spanX * scale <= widthPx - paddingPx * 2 && spanY * scale <= heightPx - paddingPx * 2) break
  }
  const scale = 256 * 2 ** zoom
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return { zoom, originX: cx - widthPx / 2 / scale, originY: cy - heightPx / 2 / scale }
}
