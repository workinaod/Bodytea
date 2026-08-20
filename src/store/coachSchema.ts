import { z } from 'zod'
import { isoDate } from './primitives'

// The coach feed, its debrief payload and the two cooldown ledgers, out
// of schema.ts for the same reason the meal, measurement and nutrition
// shapes left it: one domain, one file, and schema.ts stops being the
// place every other shape grows into.
export const coachSchema = z.object({
  feed: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      kind: z.enum(['coach', 'debrief', 'insight']),
      situation: z.string().optional(),
      text: z.string(),
      excuseId: z.string().optional(),
      weekISO: isoDate.optional(),
      debrief: z
        .object({
          date: isoDate,
          title: z.string(),
          recap: z.array(z.string()),
          recovery: z.array(z.string()),
          eat: z.array(z.string()),
          sleep: z.array(z.string()),
          tomorrow: z.string(),
        })
        .optional(),
    }),
  ),
  shownMessageIds: z.array(z.string()),
  surfacedInsights: z.record(z.string(), isoDate),
})
