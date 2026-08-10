import type { CardioOption, DayTemplate, Weekday, TierDayRole } from '../types'

// ============================================================
// Day templates transcribed from the NAOD V3 PDF.
// Tier 1 = the full week. Tier 2/3 = the PDF's fallback tiers.
// ============================================================

export const TEMPLATES: Record<string, DayTemplate> = {
  monday: {
    id: 'monday',
    title: 'Acceleration + Two-Foot Power + Lower',
    tagline: 'Catch force, then produce it: land → accelerate → jump, then lifts.',
    kind: 'session',
    cns: true,
    entries: [
      { entry: 'fixed', exerciseId: 'dynamic-warmup', sets: 1, repText: '6-8 min' },
      { entry: 'fixed', exerciseId: 'snap-down-stick', sets: 2, repText: '3', repsNum: 3 },
      { entry: 'fixed', exerciseId: 'falling-start-sprint', sets: 1, repText: '5', repsNum: 5 },
      { entry: 'fixed', exerciseId: 'countermovement-jump', sets: 3, repText: '3', repsNum: 3 },
      { entry: 'fixed', exerciseId: 'broad-jump-stick', sets: 2, repText: '3', repsNum: 3 },
      { entry: 'slot', slot: 'squatVariation', sets: 4, repText: '6-8' },
      { entry: 'fixed', exerciseId: 'romanian-deadlift', sets: 3, repText: '8', repsNum: 8 },
      { entry: 'slot', slot: 'lowerAccessory', sets: 3, repText: '10 / leg', repsNum: 10 },
      { entry: 'slot', slot: 'calf', sets: 4, repText: '15-20 / leg' },
      { entry: 'slot', slot: 'coreMon', sets: 3, repText: '15', repsNum: 15 },
    ],
    minViable: {
      label: '10-minute spark',
      items: [
        { exerciseId: 'falling-start-sprint', sets: 1, repText: '3', repsNum: 3 },
        { exerciseId: 'countermovement-jump', sets: 2, repText: '3', repsNum: 3 },
      ],
    },
    note: 'V4 order is deliberate: catch force first (snap-downs), then produce it — starts, max jumps, broad jumps — all FRESH with full recovery. The lifts stay MODERATE and explosive, 2-3 reps in the tank; Wednesday is the heavy leg day. Stop any explosive drill the moment height or speed drops.',
  },

  tuesday: {
    id: 'tuesday',
    title: 'Push + Shoulder Health',
    tagline: 'Chest, shoulders, triceps. Press hard, control the lowering.',
    kind: 'session',
    entries: [
      { entry: 'slot', slot: 'press1', sets: 4, repText: '8-12' },
      { entry: 'slot', slot: 'press2', sets: 3, repText: '8-12' },
      { entry: 'fixed', exerciseId: 'standing-ohp', sets: 4, repText: '6-10' },
      { entry: 'fixed', exerciseId: 'lateral-raise', sets: 4, repText: '15-20' },
      { entry: 'fixed', exerciseId: 'close-grip-press', sets: 3, repText: '8-10' },
      { entry: 'fixed', exerciseId: 'overhead-tricep-extension', sets: 3, repText: '12', repsNum: 12 },
      { entry: 'fixed', exerciseId: 'prone-y-raise', sets: 2, repText: '12', repsNum: 12 },
    ],
    minViable: {
      label: '15-minute press',
      items: [
        { exerciseId: 'incline-db-press', sets: 2, repText: '8-12' },
        { exerciseId: 'standing-ohp', sets: 2, repText: '6-10' },
      ],
    },
    note: 'Incline first every week — upper chest is a stated goal and it grows from incline volume. Rotator cuff work at the end keeps shoulders healthy.',
  },

  wednesday: {
    id: 'wednesday',
    title: 'Lower Strength + Hypertrophy',
    tagline: 'Heavier and slower than Monday. Thick legs and glute power.',
    kind: 'session',
    entries: [
      { entry: 'fixed', exerciseId: 'front-squat', sets: 4, repText: '6-8' },
      { entry: 'fixed', exerciseId: 'hip-thrust', sets: 4, repText: '8-10' },
      { entry: 'fixed', exerciseId: 'walking-lunge', sets: 3, repText: '12 / leg', repsNum: 12 },
      { entry: 'slot', slot: 'hamstring', sets: 3, repText: '10 / leg', repsNum: 10 },
      { entry: 'slot', slot: 'calf', sets: 4, repText: '20 / leg', repsNum: 20 },
      { entry: 'slot', slot: 'coreWed', sets: 3, repText: '15', repsNum: 15 },
    ],
    minViable: {
      label: '20-minute heavy core',
      items: [
        { exerciseId: 'front-squat', sets: 2, repText: '6-8' },
        { exerciseId: 'hip-thrust', sets: 2, repText: '8-10' },
      ],
    },
    note: 'Placed 2 days before sprints so your legs are fresh Saturday. Hip thrust: shoulders on the bench, bar across hips on a pad — huge for vertical and glute size.',
  },

  thursday: {
    id: 'thursday',
    title: 'Mobility + Active Recovery',
    tagline: 'Low stress, no lifting. Open the hips and ankles, decompress. 20-30 min.',
    kind: 'mobility',
    entries: [
      { entry: 'fixed', exerciseId: 'hip-9090-switch', sets: 2, repText: '8 / side', repsNum: 8 },
      { entry: 'fixed', exerciseId: 'deep-squat-hold', sets: 3, repText: '30 sec' },
      { entry: 'fixed', exerciseId: 'ankle-wall-mobilization', sets: 2, repText: '10 / side', repsNum: 10 },
      { entry: 'fixed', exerciseId: 'couch-stretch', sets: 2, repText: '45 sec / side' },
      { entry: 'fixed', exerciseId: 't-spine-opener', sets: 2, repText: '8 / side', repsNum: 8 },
      { entry: 'fixed', exerciseId: 'dead-hang', sets: 3, repText: '30 sec' },
      { entry: 'fixed', exerciseId: 'easy-walk', sets: 1, repText: '20-30 min' },
    ],
    minViable: {
      label: '8-minute reset',
      items: [
        { exerciseId: 'deep-squat-hold', sets: 2, repText: '30 sec' },
        { exerciseId: 'couch-stretch', sets: 1, repText: '45 sec / side' },
        { exerciseId: 'dead-hang', sets: 2, repText: '30 sec' },
      ],
    },
    note: 'Ankle and hip range directly raise your jump and protect the plant leg. This is recovery — keep it light and never grind it.',
  },

  friday: {
    id: 'friday',
    title: 'Pull + Grip + Shoulder Health',
    tagline: 'Back, biceps, rear delts. This is where lat WIDTH gets built.',
    kind: 'session',
    entries: [
      { entry: 'fixed', exerciseId: 'pull-up', sets: 4, repText: 'max' },
      { entry: 'slot', slot: 'rowVariation', sets: 4, repText: '8', repsNum: 8 },
      {
        entry: 'ab',
        a: { exerciseId: 'db-pullover', sets: 3, repText: '12', repsNum: 12 },
        b: { exerciseId: 'one-arm-db-row', sets: 3, repText: '10 / arm', repsNum: 10 },
      },
      { entry: 'fixed', exerciseId: 'rear-delt-raise', sets: 4, repText: '15', repsNum: 15 },
      { entry: 'slot', slot: 'curl', sets: 3, repText: '10', repsNum: 10 },
      { entry: 'fixed', exerciseId: 'hammer-curl', sets: 3, repText: '12', repsNum: 12 },
      { entry: 'fixed', exerciseId: 'farmer-carry', sets: 3, repText: '40-60 sec' },
      { entry: 'fixed', exerciseId: 'towel-hang', sets: 2, repText: 'max hold' },
    ],
    minViable: {
      label: '15-minute pull',
      items: [
        { exerciseId: 'pull-up', sets: 3, repText: 'max' },
        { exerciseId: 'barbell-row', sets: 2, repText: '8', repsNum: 8 },
      ],
    },
    note: 'No leg load, so your legs stay fresh for Saturday sprints. Farmer carries and towel hangs build the grip for dunking. Rear delt raises with a 3-second lowering double as shoulder health work.',
  },

  saturday: {
    id: 'saturday',
    title: 'Max Speed + One-Foot + Multidirectional',
    tagline: 'Top speed, springs, cuts, and the money jump — all max intent, all fresh.',
    kind: 'session',
    cns: true,
    entries: [
      { entry: 'fixed', exerciseId: 'dynamic-warmup', sets: 1, repText: '8-10 min' },
      { entry: 'fixed', exerciseId: 'max-velocity-sprint', sets: 1, repText: '4', repsNum: 4 },
      { entry: 'fixed', exerciseId: 'flying-sprint', sets: 1, repText: '3', repsNum: 3 },
      { entry: 'fixed', exerciseId: 'pogo-hop', sets: 3, repText: '12', repsNum: 12 },
      { entry: 'fixed', exerciseId: 'lateral-bound-stick', sets: 2, repText: '3 / side', repsNum: 3 },
      { entry: 'fixed', exerciseId: 'shuttle-5-10-5', sets: 1, repText: '3', repsNum: 3 },
      { entry: 'fixed', exerciseId: 'penultimate-approach-jump', sets: 1, repText: '5', repsNum: 5 },
      { entry: 'fixed', exerciseId: 'dunk-attempt', sets: 1, repText: '6', repsNum: 6 },
      { entry: 'slot', slot: 'curl', sets: 4, repText: '10', repsNum: 10 },
      { entry: 'fixed', exerciseId: 'lateral-raise', sets: 4, repText: '20', repsNum: 20 },
    ],
    minViable: {
      label: '12-minute speed spark',
      items: [
        { exerciseId: 'dynamic-warmup', sets: 1, repText: '5 min' },
        { exerciseId: 'max-velocity-sprint', sets: 1, repText: '3', repsNum: 3 },
        { exerciseId: 'penultimate-approach-jump', sets: 1, repText: '4', repsNum: 4 },
      ],
    },
    note: 'Sprints TRUE max effort, full recovery — walk back plus 60-90 sec, never tired. New in V4: lateral bounds and the 5-10-5 make Saturday multidirectional, and the penultimate-step approach converts your speed into height. Stop any drill the moment speed, height, or crispness drops.',
  },

  sunday: {
    id: 'sunday',
    title: 'Full Rest',
    tagline: 'Eat, sleep, stretch, recover. Steps are fine, lifting is not.',
    kind: 'rest',
    entries: [],
  },

  // ---------- Tier 2 (3-day fallback week) ----------
  't2-lower': {
    id: 't2-lower',
    title: 'Lower Strength (Tier 2)',
    tagline: 'The leg strength keeper. Heavy basics, nothing extra.',
    kind: 'session',
    entries: [
      { entry: 'fixed', exerciseId: 'front-squat', sets: 4, repText: '6-8' },
      { entry: 'fixed', exerciseId: 'hip-thrust', sets: 4, repText: '8-10' },
      { entry: 'fixed', exerciseId: 'walking-lunge', sets: 3, repText: '12 / leg', repsNum: 12 },
      { entry: 'fixed', exerciseId: 'single-leg-rdl', sets: 3, repText: '10 / leg', repsNum: 10 },
    ],
    minViable: {
      label: '15-minute legs',
      items: [
        { exerciseId: 'front-squat', sets: 2, repText: '6-8' },
        { exerciseId: 'hip-thrust', sets: 2, repText: '8-10' },
      ],
    },
    note: 'Fallback week: these preserve leg strength while life eats the schedule. Space the 3 days however the week allows.',
  },
  't2-upper': {
    id: 't2-upper',
    title: 'Upper Combined (Tier 2)',
    tagline: 'One session, whole upper body. Pull first, press second.',
    kind: 'session',
    entries: [
      { entry: 'fixed', exerciseId: 'pull-up', sets: 4, repText: 'max' },
      { entry: 'fixed', exerciseId: 'barbell-row', sets: 4, repText: '8', repsNum: 8 },
      { entry: 'fixed', exerciseId: 'incline-db-press', sets: 4, repText: '8-12' },
      { entry: 'fixed', exerciseId: 'standing-ohp', sets: 4, repText: '6-10' },
      { entry: 'fixed', exerciseId: 'ez-bar-curl', sets: 3, repText: '10', repsNum: 10 },
      { entry: 'fixed', exerciseId: 'lateral-raise', sets: 4, repText: '15-20' },
    ],
    minViable: {
      label: '15-minute upper',
      items: [
        { exerciseId: 'pull-up', sets: 3, repText: 'max' },
        { exerciseId: 'incline-db-press', sets: 2, repText: '8-12' },
      ],
    },
    note: 'Everything else drops without guilt. Protein does NOT drop with the tier.',
  },

  // ---------- Tier 3 (2-day bare minimum) ----------
  't3-fullbody': {
    id: 't3-fullbody',
    title: 'Full-Body Lift (Tier 3)',
    tagline: 'Maintenance: a squat, a press, a pull, plus core.',
    kind: 'session',
    entries: [
      { entry: 'fixed', exerciseId: 'front-squat', sets: 4, repText: '6-8' },
      { entry: 'fixed', exerciseId: 'standing-ohp', sets: 3, repText: '8', repsNum: 8 },
      { entry: 'fixed', exerciseId: 'pull-up', sets: 4, repText: 'max' },
      { entry: 'fixed', exerciseId: 'barbell-row', sets: 3, repText: '8', repsNum: 8 },
      { entry: 'fixed', exerciseId: 'hanging-leg-raise', sets: 3, repText: '15', repsNum: 15 },
    ],
    minViable: {
      label: '12-minute hold-the-line',
      items: [
        { exerciseId: 'front-squat', sets: 2, repText: '6-8' },
        { exerciseId: 'pull-up', sets: 2, repText: 'max' },
      ],
    },
    note: "Brutal week mode. You're holding ground, not progressing, until the week clears — and that's the assignment.",
  },
  't3-explosive': {
    id: 't3-explosive',
    title: 'Explosive Session (Tier 3)',
    tagline: 'Keeps speed and vertical from going backwards.',
    kind: 'session',
    cns: true,
    entries: [
      { entry: 'fixed', exerciseId: 'dynamic-warmup', sets: 1, repText: '8-10 min' },
      { entry: 'fixed', exerciseId: 'max-velocity-sprint', sets: 1, repText: '5', repsNum: 5 },
      { entry: 'fixed', exerciseId: 'flying-sprint', sets: 1, repText: '3', repsNum: 3 },
      { entry: 'fixed', exerciseId: 'pogo-hop', sets: 4, repText: '12', repsNum: 12 },
      { entry: 'fixed', exerciseId: 'approach-jump', sets: 1, repText: '8', repsNum: 8 },
      { entry: 'fixed', exerciseId: 'dunk-attempt', sets: 1, repText: '8', repsNum: 8 },
    ],
    minViable: {
      label: '12-minute speed spark',
      items: [
        { exerciseId: 'dynamic-warmup', sets: 1, repText: '5 min' },
        { exerciseId: 'max-velocity-sprint', sets: 1, repText: '3', repsNum: 3 },
        { exerciseId: 'approach-jump', sets: 1, repText: '4', repsNum: 4 },
      ],
    },
    note: "Never drop the explosive day. It's the first thing people cut and the fastest thing to lose.",
  },
}

/** Tier 1: weekday → template id (0=Sunday). */
export const TIER1_BY_WEEKDAY: Record<Weekday, string | null> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/** Tier 2/3 role → template id. Explosive day is the Saturday session. */
export const TIER_ROLE_TEMPLATES: Record<2 | 3, Partial<Record<TierDayRole, string>>> = {
  2: { lower: 't2-lower', upper: 't2-upper', explosive: 'saturday' },
  3: { fullbody: 't3-fullbody', explosive: 't3-explosive' },
}

/** Default weekday placement for tier 2/3 roles (user can move; explosive can never be removed). */
export const TIER_DEFAULT_PLACEMENT: Record<2 | 3, Partial<Record<TierDayRole, Weekday>>> = {
  2: { lower: 1, upper: 3, explosive: 6 },
  3: { fullbody: 3, explosive: 6 },
}

// ---------- Cardio backup options (replace basketball on no-ball weeks) ----------

export type { CardioOption } from '../types'

export const CARDIO_OPTIONS: CardioOption[] = [
  { exerciseId: 'easy-jog', repText: '25-30 min', group: 'A' },
  { exerciseId: 'brisk-walk', repText: '30-45 min', group: 'A' },
  { exerciseId: 'incline-walk', repText: '25-30 min', group: 'A' },
  { exerciseId: 'hill-sprint', repText: '6-10 sprints', group: 'B' },
  { exerciseId: 'parking-lot-sprint', repText: '6-10 reps', group: 'B' },
  { exerciseId: 'stair-run', repText: '8-12 rounds', group: 'B' },
  { exerciseId: 'circuit-a', repText: '4-5 rounds', group: 'circuit' },
  { exerciseId: 'circuit-b', repText: '8-10 rounds', group: 'circuit' },
]

export const CARDIO_GROUP_INFO = {
  A: {
    title: 'Option A — Zone 2 Easy',
    when: "You're tired, sore, recovering, or just want low-stress cardio. Won't interfere with lifting or jumps.",
  },
  B: {
    title: 'Option B — Higher Intensity',
    when: 'You have energy and want a harder session. Do this when legs are fresh — never the day before Monday or Saturday.',
  },
  circuit: {
    title: 'Home Circuits — No equipment',
    when: 'Weather is bad, no space to run, still want to sweat.',
  },
} as const

export function getTemplate(id: string): DayTemplate {
  const t = TEMPLATES[id]
  if (!t) throw new Error(`Unknown template id: ${id}`)
  return t
}
