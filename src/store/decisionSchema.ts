import { z } from 'zod'
import { isoDate } from './primitives'

// The stored twin of src/decisionTypes.ts. Defaulted at the AppData
// level, so an envelope written before the ledger existed parses clean
// and starts empty: no migration, no SCHEMA_VERSION bump, same as
// `adapt` and `journey` before it.
export const decisionSchema = z.object({
  id: z.string(),
  type: z.string(),
  target: z.string(),
  ruleVersion: z.number().int().nonnegative(),
  evidence: z.record(z.string(), z.union([z.number(), z.string()])),
  offeredAt: isoDate,
  response: z.enum(['accepted', 'declined', 'expired-unseen']).optional(),
  respondedAt: isoDate.optional(),
  metricId: z.string().optional(),
  windowDays: z.number().int().positive().optional(),
  windowClosesAt: isoDate.optional(),
  baseline: z.number().optional(),
  outcome: z.number().optional(),
  verdict: z.enum(['worked', 'no-change', 'worse', 'unattributable', 'abandoned']).optional(),
  revertTaken: z.boolean().optional(),
})

/**
 * The AppData field, ready-made.
 *
 * Defaulted here rather than at the call site so the reason travels with
 * it: an envelope written before the ledger existed parses clean and
 * starts empty, which is why this needs no migration and no
 * SCHEMA_VERSION bump, exactly as `adapt` and `journey` did not.
 */
export const decisionsField = z.array(decisionSchema).default([])
