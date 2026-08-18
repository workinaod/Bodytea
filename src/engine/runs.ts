import type { AppData, ISODate, RunLog, RunPoint } from '../types'
import type { GpsActivity } from '../activityTypes'
import { addDaysISO, mondayOf } from './calendar'
import { haversineMi } from './geoMath'
import { elevationStats } from './elevation'

// ============================================================
// GPS run/ride math, all pure. Points are [lat, lng, elapsedSec].
// Distance via haversine with junk-fix filtering; pace, splits,
// and weekly mileage for the Progress chart. Also the Web
// Mercator projection the route map draws with.
// ============================================================

// Moved to geoMath.ts so elevation.ts can share it, re-exported here
// because half the app already imports it from this module.
export { haversineMi } from './geoMath'

/**
 * Should this GPS fix be kept? Rejects low-accuracy fixes, teleports
 * (> 45 mph between fixes, nobody runs or city-bikes that), and
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

/** Miles of GPS wobble to clear before movement counts as movement. */
export const MIN_MOVE_MI = 0.005

/**
 * Should this fix ADD to a running distance total?
 *
 * Stricter than acceptFix, on purpose. acceptFix takes any fix once
 * 20 seconds have passed, because a route being DRAWN wants a point
 * even while you wait at a light. A total being ADDED UP does not:
 * that clause turns GPS wobble into mileage, and an hour spent on the
 * sideline of a game logs as a quarter mile walked.
 *
 * Holding the previous point instead of advancing it loses nothing.
 * Someone genuinely moving slowly still gets every yard, credited in
 * chunks once they clear the noise floor rather than continuously.
 */
export function creditsDistance(
  prev: RunPoint | null,
  lat: number,
  lng: number,
  elapsedSec: number,
  accuracyM: number,
): boolean {
  if (accuracyM > 50) return false
  if (!prev) return false
  const dt = elapsedSec - prev[2]
  if (dt <= 0) return false
  const dMi = haversineMi(prev[0], prev[1], lat, lng)
  if ((dMi / dt) * 3600 > 45) return false
  return dMi >= MIN_MOVE_MI
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
  if (!secPerMi) return '--'
  const m = Math.floor(secPerMi / 60)
  const s = Math.round(secPerMi % 60)
  return `${m}:${String(s).padStart(2, '0')}/mi`
}

const toKg = (lb: number) => Math.min(150, Math.max(40, (lb || 175) * 0.4536))

/**
 * MET-based calorie estimate: honest math from speed and bodyweight
 * until wearables provide the real number. Running lands on the ACSM
 * table (6 mph ≈ 9.9 METs); riding uses the standard speed brackets.
 *
 * Speed is only known when distance is. A treadmill run with no GPS
 * still burns calories, so a zero-distance session falls back to the
 * activity's moderate MET rather than scoring zero, which is what made
 * a logged run with no distance vanish from the day.
 */
export function estKcal(
  activity: GpsActivity,
  distanceMi: number,
  durationSec: number,
  bodyweightLb: number,
  climbGainM = 0,
): number {
  if (durationSec < 60) return 0
  const kg = toKg(bodyweightLb)
  // The climb is charged on top of whatever the flat-ground term
  // works out to. Speed alone cannot see it: a 10-minute mile up a
  // canyon and a 10-minute mile on a track are the same MET to the
  // table below and nowhere near the same work.
  const climb = climbKcal(climbGainM, bodyweightLb)
  if (distanceMi <= 0) {
    const flat = activity === 'run' ? 9.8 : activity === 'bike' ? 8.0 : activity === 'hike' ? 6.0 : 4.3
    return Math.round(flat * kg * (durationSec / 3600)) + climb
  }
  const mph = (distanceMi / durationSec) * 3600
  const met =
    activity === 'run'
      ? Math.max(3.5, 1.65 * mph)
      : activity === 'hike'
        ? // Compendium: cross-country hiking sits at 6.0 and climbs with
          // pace. Flat ground under 2 mph is still walking work.
          Math.max(4.5, 6.0 + Math.max(0, mph - 3) * 1.2)
        : activity === 'walk'
        ? mph < 2.5
          ? 2.8
          : mph < 3.5
            ? 3.5
            : mph < 4
              ? 5.0
              : 6.3
        : mph < 10
          ? 4
          : mph < 12
            ? 6
            : mph < 14
              ? 8
              : mph < 16
                ? 10
                : 12
  return Math.round(met * kg * (durationSec / 3600)) + climb
}

/**
 * Gross mechanical efficiency of human locomotion going uphill.
 *
 * Walking, running and riding all land near this once the whole body
 * is counted, which is why one constant serves all four GPS sports
 * rather than four tuned ones pretending to a precision that GPS
 * altitude cannot support anyway.
 */
export const CLIMB_EFFICIENCY = 0.23

/**
 * Extra calories bought by lifting bodyweight up the climb.
 *
 * Physics, not a lookup table: raising m kilograms h metres costs
 * m·g·h joules of mechanical work, and the body buys that work at
 * CLIMB_EFFICIENCY. The rest leaves as heat and still has to be paid
 * for.
 *
 *   kcal = m·g·h / efficiency / 4184
 *
 * Which lands on the field rule of about 1 kcal per kg of body mass
 * per 100 m climbed — a 175 lb runner up 1,000 ft pays ~240 kcal.
 *
 * Only ascent is charged. Descending has a real eccentric cost, but
 * it is small, poorly characterised, and the flat-ground MET term
 * already covers moving the legs. Charging for it would be inventing
 * precision the input does not have.
 */
export function climbKcal(gainM: number, bodyweightLb: number): number {
  if (!Number.isFinite(gainM) || gainM <= 0) return 0
  const joules = (toKg(bodyweightLb) * 9.80665 * gainM) / CLIMB_EFFICIENCY
  return Math.round(joules / 4184)
}

/**
 * Calories for anything logged by time rather than distance: a game, a
 * swim, a round on the bag. Straight Compendium MET math.
 */
export function estKcalFromMet(met: number, minutes: number, bodyweightLb: number): number {
  if (minutes <= 0 || met <= 0) return 0
  return Math.round(met * toKg(bodyweightLb) * (minutes / 60))
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** Speed in mph, the natural stat for rides. */
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
  // Computed from the FULL track, before compressTrack throws five in
  // six points away. Subsampling a profile flattens it: the summit is
  // exactly the kind of point that gets dropped, and the climb would
  // shrink the longer the session ran.
  const elev = elevationStats(points)
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
    ...(elev.samples > 1 ? { elevGainFt: elev.gainFt, elevLossFt: elev.lossFt } : {}),
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

// ---------- Run goal review: every run measured against the race ----------

export interface RunGoalReview {
  title: string
  rows: { label: string; value: string }[]
  notes: string[]
}

const RACES: { key: RegExp; label: string; mi: number; peakLong: number; peakWeek: number }[] = [
  { key: /ultra|50\s?k|100\s?k|50\s?mi|100\s?mi/i, label: 'Ultra', mi: 31, peakLong: 26, peakWeek: 48 },
  { key: /half\s*-?\s*marathon|13\.1/i, label: 'Half marathon', mi: 13.1, peakLong: 11, peakWeek: 22 },
  { key: /marathon|26\.2/i, label: 'Marathon', mi: 26.2, peakLong: 20, peakWeek: 36 },
  { key: /10\s*k/i, label: '10K', mi: 6.2, peakLong: 5, peakWeek: 15 },
  { key: /5\s*k/i, label: '5K', mi: 3.1, peakLong: 2.5, peakWeek: 10 },
]

function raceTarget(data: AppData): (typeof RACES)[number] | null {
  const ans = data.plan.goalAnswers?.['race-what'] ?? ''
  const text = `${ans} ${data.plan.goalStatement}`
  for (const r of RACES) if (r.key.test(text)) return r
  return null
}

/**
 * Post-run check-in against the runner's actual goal. Race pickers and
 * "marathon by fall" goal statements both resolve; endurance plans
 * without a race still get a distance review. Lifters get nothing,
 * their debrief lives elsewhere.
 */
export function runGoalReview(data: AppData, log: RunLog): RunGoalReview | null {
  if (log.activity !== 'run') return null
  const race = raceTarget(data)
  if (!race && data.plan.goal !== 'endurance') return null

  const runs = data.runs.filter((r) => r.activity === 'run')
  const longest = Math.max(0, ...runs.map((r) => r.distanceMi))
  const weekStart = mondayOf(log.date)
  const weekMi =
    Math.round(
      runs
        .filter((r) => mondayOf(r.date) === weekStart)
        .reduce((s, r) => s + r.distanceMi, 0) * 10,
    ) / 10

  const rows: { label: string; value: string }[] = [
    { label: 'This run', value: `${log.distanceMi.toFixed(2)} mi · ${fmtPace(log.avgPaceSec)}` },
    { label: 'Longest run', value: `${longest.toFixed(1)} mi` },
    { label: 'This week', value: `${weekMi} mi` },
  ]
  const notes: string[] = []

  if (race) {
    rows.push({ label: 'Race', value: `${race.label} · ${race.mi} mi` })
    if (longest < race.peakLong) {
      notes.push(
        `Long runs carry a ${race.label.toLowerCase()}. Build the weekly long one toward ${race.peakLong} mi; today's longest is ${longest.toFixed(1)}.`,
      )
    } else {
      notes.push(`Your long run already covers a ${race.label.toLowerCase()} build. Now it's about repeating it and holding pace.`)
    }
    if (weekMi < race.peakWeek) {
      notes.push(`Weekly volume is the engine: a ${race.label.toLowerCase()} build peaks near ${race.peakWeek} mi a week. Add gently, about 10% at a time.`)
    } else {
      notes.push('Weekly volume is where it needs to be. Protect it: easy paces, boring consistency.')
    }
  } else {
    notes.push('No race on the calendar, so the win is simple: one run a hair longer than last week, most of them easy.')
  }

  // Easy/hard read: compare against the median of recent runs
  const recent = runs
    .filter((r) => r.id !== log.id && r.avgPaceSec > 0)
    .slice(-5)
    .map((r) => r.avgPaceSec)
    .sort((a, b) => a - b)
  if (recent.length >= 2 && log.avgPaceSec > 0) {
    const median = recent[Math.floor(recent.length / 2)]
    if (log.avgPaceSec < median * 0.92)
      notes.push('Fast one. Keep most runs easy: easy miles build the engine, the fast ones just sharpen it.')
    else if (log.avgPaceSec > median * 1.05)
      notes.push('Good easy pace. This is where the aerobic base actually grows.')
  }

  return { title: race ? `${race.label} check-in` : 'Distance check-in', rows, notes: notes.slice(0, 3) }
}
