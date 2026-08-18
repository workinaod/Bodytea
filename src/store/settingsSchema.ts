import { z } from 'zod'
import { isoDate, weekday } from './primitives'

// ============================================================
// Who the athlete is, and how they have set the app up.
//
// Split out of schema.ts beside sessionSchema, prefsSchema and
// mealPlanSchema, for the reason those went: the envelope file should
// read as a list of what an app data file holds, not as the field by
// field definition of each part of it.
// ============================================================

export const settingsSchema = z.object({
  phaseStartDate: isoDate,
  installedAt: isoDate,
  checkinWeekday: weekday,
  trainingDayKcalBonus: z.union([z.literal(0), z.literal(150), z.literal(200)]),
  proteinTargetG: z.number().positive(),
  restTimerEnabled: z.boolean(),
  lastExportAt: z.string().nullable(),
  onboarded: z.boolean(),
  remindersEnabled: z.boolean(),
  reminderTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(3),
  units: z.enum(['imperial', 'metric']),
  reviewsSeen: z.array(z.string()).optional(),
  voiceCoach: z.boolean().optional(),
  voiceURI: z.string().optional(),
  voiceSetVersion: z.number().optional(),
  soundMode: z.enum(['voice', 'beeps-names', 'beeps', 'silent']).optional(),
  cadenceSpeed: z.number().min(0.5).max(2).optional(),
  voiceUsed: z.boolean().optional(),
})

export const profileSchema = z.object({
  displayName: z.string().optional(),
  username: z.string().optional(),
  heightIn: z.number().optional(),
  bfFormula: z.enum(['male', 'female']).optional(),
  /**
   * Years. Optional, so every envelope written before the question
   * existed still parses and needs no migration.
   */
  age: z.number().optional(),
})
