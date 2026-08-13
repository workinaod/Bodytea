import { z } from 'zod'
import { isoDate } from './primitives'

// ============================================================
// The zod mirror of prefsTypes.ts, beside the types it mirrors
// and out of schema.ts, which is at its line allowance. Same
// arrangement as sessionSchema.ts.
//
// Defaulted all the way down, for the reason `adapt` and
// `journey` are: an envelope written before this key existed
// parses cleanly and starts with an empty set of preferences, so
// there is no migration and no SCHEMA_VERSION bump. Nothing is
// lost either way, because an athlete who has never been asked
// has nothing stored to lose.
// ============================================================

export const prefsSchema = z
  .object({
    blocked: z
      .array(
        z.object({
          exerciseId: z.string(),
          reason: z.enum(['dislike', 'hurts', 'cannot']),
          since: isoDate,
        }),
      )
      .default([]),
    pinned: z.array(z.string()).default([]),
    limitations: z
      .array(z.object({ label: z.string(), joints: z.array(z.string()), since: isoDate }))
      .default([]),
    sessionMinutes: z.number().optional(),
  })
  .default({ blocked: [], pinned: [], limitations: [] })
