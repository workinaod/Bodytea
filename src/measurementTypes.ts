import type { ISODate } from './types'

// ============================================================
// What the body measured, and the pictures of it.
//
// Split out of types.ts so the file could stop growing, and put
// beside store/measurementSchema.ts which already owns the zod
// mirror of exactly these shapes.
//
// Photo BLOBS are not here and never will be: only the id lives
// in state, the bytes live in IndexedDB (store/storage.ts). A
// year of progress photos inside the saved state envelope would
// blow the browser's quota and take the whole save with it.
// ============================================================

export interface Measurement {
  date: ISODate
  weightLb?: number
  /** Estimated body fat %, consistency of method beats accuracy. */
  bodyFatPct?: number
  /** Tape sites for the Navy estimate (stored so trends stay honest). */
  neckIn?: number
  hipIn?: number
  waistIn?: number
  chestIn?: number
  armsIn?: number
  thighIn?: number
  /** Vertical reach / rim touch in inches (their choice of metric, tracked consistently). */
  vertIn?: number
  photoIds: Partial<Record<'front' | 'side' | 'back', string>>
}

export interface PhotoMeta {
  id: string
  kind: 'progress' | 'proof'
  takenAt: string
  w: number
  h: number
  bytes: number
}
