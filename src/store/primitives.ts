import { z } from 'zod'

// ============================================================
// The zod primitives shared across the schema files. Same idea
// as plan/muscleRegions.ts: the vocabulary lives on its own so
// two files can speak it without one importing the other.
// ============================================================

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const weekday = z.number().int().min(0).max(6)
