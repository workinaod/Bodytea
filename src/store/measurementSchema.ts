import { z } from 'zod'
import { isoDate } from './primitives'

// ============================================================
// What the athlete measured, and the photos beside it.
//
// Out of schema.ts for the same reason Profile left types.ts: this shape
// grows every time the app learns to track one more thing, and it was
// pushing the file that holds every OTHER shape toward its cap.
// ============================================================

export const measurementSchema = z.object({
  date: isoDate,
  weightLb: z.number().optional(),
  bodyFatPct: z.number().optional(),
  neckIn: z.number().optional(),
  hipIn: z.number().optional(),
  waistIn: z.number().optional(),
  chestIn: z.number().optional(),
  armsIn: z.number().optional(),
  thighIn: z.number().optional(),
  vertIn: z.number().optional(),
  photoIds: z.object({
    front: z.string().optional(),
    side: z.string().optional(),
    back: z.string().optional(),
  }),
})

export const photoMetaSchema = z.object({
  id: z.string(),
  kind: z.enum(['progress', 'proof']),
  takenAt: z.string(),
  w: z.number(),
  h: z.number(),
  bytes: z.number(),
})
