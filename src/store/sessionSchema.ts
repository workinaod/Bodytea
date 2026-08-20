import { z } from 'zod'
import { isoDate } from './primitives'

// ============================================================
// The zod mirror of sessionTypes.ts. Kept beside its types
// rather than in schema.ts, which had reached its line
// allowance with no room to add a field.
//
// Every field added here must also be added to
// src/sessionTypes.ts, and vice versa. Optional fields need no
// migration: zod parses older envelopes that lack them, which
// is how ExerciseLog.feel already works.
// ============================================================

export const setLogSchema = z.object({
  targetReps: z.string(),
  weightLb: z.number().optional(),
  reps: z.number().optional(),
  seconds: z.number().optional(),
  done: z.boolean(),
  achieved: z.number().optional(),
  light: z.boolean().optional(),
})

export const sessionSchema = z.object({
  date: isoDate,
  templateId: z.string(),
  status: z.enum(['completed', 'partial', 'skipped', 'downgraded-completed']),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  readiness: z
    .object({
      flags: z.tuple([z.boolean(), z.boolean(), z.boolean(), z.boolean()]),
      downgraded: z.boolean(),
    })
    .optional(),
  intensity: z.enum(['full', 'lighter', 'minimum']).optional(),
  makeupFor: isoDate.optional(),
  ownPlanStarted: z.boolean().optional(),
  customTitle: z.string().optional(),
  trimmedFromIndex: z.number().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      fromSlot: z.string().optional(),
      sets: z.array(setLogSchema),
      skipped: z.boolean().optional(),
      feel: z.enum(['easy', 'right', 'hard']).optional(),
      rir: z.number().optional(),
    }),
  ),
  notes: z.string().optional(),
  feel: z.enum(['light', 'right', 'heavy']).optional(),
  fatigue: z
    .array(
      z.object({
        exerciseId: z.string(),
        reason: z.enum(['fried', 'form', 'pain', 'empty']),
        atSetIdx: z.number().int().min(0),
        // Regions are the muscle vocabulary, but validated as plain strings:
        // a note written before a region was renamed must still load.
        regions: z.array(z.string()),
        note: z.string().optional(),
      }),
    )
    .optional(),
})
