import type { AppData, ISODate, PlanConfig, Settings, WeekState } from './types'
import { emptyJourney } from './journeyTypes'
import { emptyPrefs } from './prefsTypes'
import { buildNaodPreset } from './plan/presets/naod'

// ============================================================
// The empty shapes: a fresh account, a fresh week, a fresh
// settings block.
//
// Split out of types.ts, which is a file of TYPES and had grown
// three factories at the bottom of it. Every caller still
// imports these from types.ts, which re-exports them, so this
// move is invisible outside these two files.
//
// There is no runtime cycle: the types import above is
// type-only and TypeScript erases it, so the only real edge is
// emptyData -> presets -> templates/exercises, one-directional.
// ============================================================

export function defaultSettings(phaseStartDate: ISODate, installedAt: ISODate = phaseStartDate): Settings {
  return {
    phaseStartDate,
    installedAt,
    checkinWeekday: 0,
    trainingDayKcalBonus: 0,
    proteinTargetG: 200,
    restTimerEnabled: true,
    lastExportAt: null,
    onboarded: false,
    remindersEnabled: false,
    reminderTimes: ['05:00', '17:00'], // max two nudges a day
    units: 'imperial',
  }
}

export function defaultWeekState(mondayISO: ISODate): WeekState {
  return {
    mondayISO,
    tier: 1,
    tierPickedAt: null,
    tierChanges: [],
    ballThisWeek: null,
    ballDates: [],
    cnsSwapDates: [],
    cardio: null,
    events: {},
    badSleepDates: [],
  }
}

export function emptyAppData(phaseStartDate: ISODate, installedAt?: ISODate, plan?: PlanConfig): AppData {
  return {
    settings: defaultSettings(phaseStartDate, installedAt),
    plan: plan ?? buildNaodPreset(),
    profile: {},
    weeks: {},
    sessions: {},
    excuses: [],
    meals: {},
    measurements: [],
    photos: [],
    coach: { feed: [], shownMessageIds: [], surfacedInsights: {} },
    grocery: [],
    cardio: {},
    swaps: {},
    dayLoad: {},
    adapt: {},
    runs: [],
    journey: emptyJourney(),
    achievements: { earnedAt: {} },
    prefs: emptyPrefs(),
  }
}
