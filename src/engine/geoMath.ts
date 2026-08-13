// ============================================================
// The one great-circle distance function, on its own so that
// both the distance/pace math in runs.ts and the elevation math
// in elevation.ts can have it without importing each other.
//
// It lived in runs.ts first. Elevation needs it to know how much
// GROUND a climb was spread over — a 30 m rise is a ramp or a
// wall depending entirely on that denominator — and runs.ts in
// turn needs elevation to stamp a finished log. Two modules that
// each import the other is a cycle waiting to bite, so the piece
// they share moved down here instead.
// ============================================================

/** Mean earth radius in miles. */
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
