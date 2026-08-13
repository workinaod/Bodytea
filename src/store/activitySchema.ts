import { z } from 'zod'
import { isoDate } from './primitives'

// ============================================================
// The zod mirror of activityTypes.ts: GPS sessions and the
// daily cardio / sport log. Kept beside the types it mirrors,
// the same split sessionSchema.ts already made, because
// schema.ts had reached its line allowance with no room to fix
// a bug in it.
//
// Every field added here must also be added to
// src/activityTypes.ts, and vice versa. Drift between the two
// is not caught by the compiler, because zod validates data
// read from disk rather than the type: the enum below listed
// three activities while GpsActivity listed four, and the app
// happily recorded hikes it could never restore.
//
// Optional fields need no migration. Zod parses older
// envelopes that lack them, which is how RunLog.steps already
// works.
// ============================================================

export const runLogSchema = z.object({
  id: z.string(),
  /** Must stay in step with GpsActivity. */
  activity: z.enum(['run', 'bike', 'walk', 'hike']),
  date: isoDate,
  startedAt: z.string(),
  durationSec: z.number().min(0),
  distanceMi: z.number().min(0),
  distanceSource: z.enum(['gps', 'steps', 'manual', 'none']).optional(),
  steps: z.number().min(0).optional(),
  avgPaceSec: z.number().min(0),
  kcalEst: z.number().min(0).optional(),
  elevGainFt: z.number().min(0).optional(),
  elevLossFt: z.number().min(0).optional(),
  splits: z.array(z.number()),
  // The fourth slot is altitude in metres, and it is `.rest()` rather
  // than a wider tuple so both shapes parse: three-element points from
  // every session recorded before elevation existed, and four-element
  // points from every one after. A stored run must never fail to load
  // because the recorder learned a new trick.
  points: z.array(z.tuple([z.number(), z.number(), z.number()]).rest(z.number())),
  feltIntensity: z.enum(['low', 'standard', 'high']).optional(),
})

export const cardioEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  activityId: z.string(),
  label: z.string(),
  when: z.enum(['pre', 'post', 'solo']),
  where: z.enum(['indoor', 'outdoor']).optional(),
  miles: z.number().optional(),
  minutes: z.number().optional(),
  mode: z.string().optional(),
  floors: z.number().min(0).optional(),
  runId: z.string().optional(),
  // Only on live-tracked sessions. Everything logged before these
  // existed parses unchanged, which is the whole point of optional.
  steps: z.number().min(0).optional(),
  distanceSource: z.enum(['gps', 'steps', 'manual', 'none']).optional(),
  intensity: z.enum(['low', 'standard', 'high']).optional(),
  kcalEst: z.number().min(0).optional(),
  feltIntensity: z.enum(['low', 'standard', 'high']).optional(),
})
