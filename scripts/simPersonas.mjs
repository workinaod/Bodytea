// ============================================================
// Twenty people, and the lives that get in the way.
//
// The point is range: goals that pull in different directions
// (dunk vs marathon vs 315 squat vs 60 lb off), rooms that
// contain different things, training ages from never-trained to
// twenty years in, and obligations that actually cost sessions.
//
// `behaviour` is how they TRAIN, not what they want. It is what
// makes the simulation worth running: an engine only shows you
// whether it is learning if the person feeding it is inconsistent
// in a specific way.
//   adherence   how often the session actually happens
//   shortfall   how often a set comes up short of the ask
//   hard        how often the day gets answered "heavy"
//   rir         reps they tend to leave in the tank
//   fade        how much the shortfall rate rises late in a session
// ============================================================

export const PERSONAS = [
  {
    id: 'dunk-novice',
    who: '19, never trained, wants to dunk a basketball',
    life: 'College, no job, trains whenever',
    answers: {
      goal: 'vertical', goalStatement: 'dunk on a 10-ft rim',
      customTargets: [{ label: 'Vert', target: 30, unit: 'in' }],
      daysPerWeek: 4, equipProfile: 'gym', extraEquip: [], experience: 'new',
      bodyweightLb: 165, sex: 'male', mealsPerDay: 4,
      goalAnswers: { 'vert-now': 'Not close yet', 'jump-history': 'Never', 'vert-missing': 'Not sure' },
    },
    behaviour: { adherence: 0.92, shortfall: 0.12, hard: 0.15, rir: 2, fade: 0.10 },
  },
  {
    id: 'fatloss-desk',
    who: '38, 60 lb to lose, desk job',
    life: 'Nine to five sitting down, late-night eating',
    answers: {
      goal: 'lean', goalStatement: 'lose 60 lb and keep it off',
      customTargets: [{ label: 'Bodyweight', target: 190, unit: 'lb' }],
      daysPerWeek: 3, equipProfile: 'home-db', extraEquip: [], experience: 'new',
      bodyweightLb: 250, sex: 'male', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Desk job', kind: 'on-feet' }],
      goalAnswers: { 'lose-amount': '30+ lb', 'food-struggle': 'Late-night eating', 'day-activity': 'Mostly sitting' },
    },
    behaviour: { adherence: 0.70, shortfall: 0.22, hard: 0.30, rir: 1, fade: 0.18 },
  },
  {
    id: 'marathon-first',
    who: '31, first marathon in six months',
    life: 'Runs 12 mi/wk already, lifting is the side dish',
    answers: {
      goal: 'endurance', goalStatement: 'finish my first marathon',
      customTargets: [{ label: 'Longest run', target: 26.2, unit: 'mi' }],
      daysPerWeek: 4, equipProfile: 'minimal', extraEquip: [], experience: 'returning',
      bodyweightLb: 155, sex: 'female', mealsPerDay: 4,
      goalAnswers: { 'race-what': 'Marathon', 'run-now': '10 to 25 mi', 'race-when': '3 to 6 months' },
    },
    behaviour: { adherence: 0.85, shortfall: 0.10, hard: 0.22, rir: 2, fade: 0.12 },
  },
  {
    id: 'powerlifter',
    who: '27, wants a 315 squat',
    life: 'Trains like it is the job, five days',
    answers: {
      goal: 'strength', goalStatement: 'squat 315 for reps',
      customTargets: [{ label: 'Squat', target: 315, unit: 'lb' }],
      daysPerWeek: 5, equipProfile: 'gym', extraEquip: [], experience: 'trained',
      bodyweightLb: 195, sex: 'male', mealsPerDay: 4,
    },
    behaviour: { adherence: 0.96, shortfall: 0.08, hard: 0.25, rir: 1, fade: 0.06 },
  },
  {
    id: 'night-shift-mum',
    who: '45, two kids, rotating night shifts',
    life: 'Sessions get eaten by everything else',
    answers: {
      goal: 'general', goalStatement: 'have energy for my kids',
      customTargets: [], daysPerWeek: 3, equipProfile: 'minimal', extraEquip: [],
      experience: 'returning', bodyweightLb: 160, sex: 'female', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Night shift', kind: 'late-night' }, { label: 'School run', kind: 'on-feet' }],
    },
    behaviour: { adherence: 0.55, shortfall: 0.20, hard: 0.35, rir: 2, fade: 0.20 },
  },
  {
    id: 'sprinter',
    who: '22, wants a faster 40-yard dash',
    life: 'Off-season, five days, fully committed',
    answers: {
      goal: 'speed', goalStatement: 'run a faster 40',
      customTargets: [{ label: '40 yd', target: 4.5, unit: 's' }],
      daysPerWeek: 5, equipProfile: 'gym', extraEquip: [], experience: 'trained',
      bodyweightLb: 180, sex: 'male', mealsPerDay: 5,
    },
    behaviour: { adherence: 0.94, shortfall: 0.09, hard: 0.20, rir: 2, fade: 0.08 },
  },
  {
    id: 'hardgainer',
    who: '34, wants 20 lb of muscle',
    life: 'Eats like a bird, trains like a lion',
    answers: {
      goal: 'muscle', goalStatement: 'gain 20 pounds of muscle',
      customTargets: [{ label: 'Bodyweight', target: 185, unit: 'lb' }],
      daysPerWeek: 5, equipProfile: 'gym', extraEquip: [], experience: 'returning',
      bodyweightLb: 145, sex: 'male', mealsPerDay: 5,
    },
    behaviour: { adherence: 0.88, shortfall: 0.14, hard: 0.28, rir: 1, fade: 0.14 },
  },
  {
    id: 'bad-back',
    who: '52, twenty years of back trouble',
    life: 'Wants to still be moving at 70',
    answers: {
      goal: 'general', goalStatement: 'keep my back working',
      customTargets: [], daysPerWeek: 3, equipProfile: 'home-db', extraEquip: [],
      experience: 'new', bodyweightLb: 200, sex: 'male', mealsPerDay: 3,
    },
    prefs: { limitations: [{ label: 'lower back, twenty years of it', joints: ['lower-back'], since: '2026-08-10' }] },
    behaviour: { adherence: 0.78, shortfall: 0.18, hard: 0.30, rir: 2, fade: 0.16 },
  },
  {
    id: 'everydayer',
    who: '29, trains six days because they like it',
    life: 'No obligations worth the name',
    answers: {
      goal: 'general', goalStatement: 'be good at everything',
      customTargets: [], daysPerWeek: 6, equipProfile: 'gym', extraEquip: [],
      experience: 'trained', bodyweightLb: 175, sex: 'male', mealsPerDay: 4,
    },
    behaviour: { adherence: 0.90, shortfall: 0.10, hard: 0.18, rir: 2, fade: 0.10 },
  },
  {
    id: 'nurse-lean',
    who: '41, nurse, wants to lean out',
    life: 'Twelve-hour shifts, on her feet the whole time',
    answers: {
      goal: 'lean', goalStatement: 'drop two dress sizes',
      customTargets: [{ label: 'Bodyweight', target: 145, unit: 'lb' }],
      daysPerWeek: 3, equipProfile: 'minimal', extraEquip: [], experience: 'returning',
      bodyweightLb: 172, sex: 'female', mealsPerDay: 3,
      lifeSeeds: [{ label: '12-hour shift', kind: 'on-feet' }],
    },
    behaviour: { adherence: 0.62, shortfall: 0.24, hard: 0.38, rir: 1, fade: 0.22 },
  },
  {
    id: 'hooper-home',
    who: '18, basketball, jumping out of a home garage',
    life: 'Two dumbbells and a pull-up bar',
    answers: {
      goal: 'vertical', goalStatement: 'dunk before senior year',
      customTargets: [{ label: 'Vert', target: 32, unit: 'in' }],
      daysPerWeek: 4, equipProfile: 'home-db', extraEquip: ['pullup-bar'], experience: 'new',
      bodyweightLb: 155, sex: 'male', mealsPerDay: 4,
      goalAnswers: { 'vert-now': 'Rim, not much more', 'jump-history': 'Some', 'vert-missing': 'Strength' },
    },
    behaviour: { adherence: 0.86, shortfall: 0.15, hard: 0.20, rir: 2, fade: 0.12 },
  },
  {
    id: 'thirty-minutes',
    who: '36, two kids, thirty minutes and not a minute more',
    life: 'The session has to fit or it does not happen',
    answers: {
      goal: 'muscle', goalStatement: 'look like I train',
      customTargets: [], daysPerWeek: 4, equipProfile: 'gym', extraEquip: [],
      experience: 'returning', bodyweightLb: 185, sex: 'male', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Bedtime routine', kind: 'late-night' }],
    },
    prefs: { sessionMinutes: 30 },
    behaviour: { adherence: 0.80, shortfall: 0.13, hard: 0.24, rir: 2, fade: 0.14 },
  },
  {
    id: 'hates-squats',
    who: '25, will not squat, has said so',
    life: 'Otherwise trains happily four days',
    answers: {
      goal: 'muscle', goalStatement: 'put on size for football',
      customTargets: [], daysPerWeek: 4, equipProfile: 'gym', extraEquip: [],
      experience: 'trained', bodyweightLb: 205, sex: 'male', mealsPerDay: 5,
    },
    prefs: { blocked: [{ exerciseId: 'goblet-squat', reason: 'dislike', since: '2026-08-10' }] },
    behaviour: { adherence: 0.90, shortfall: 0.11, hard: 0.20, rir: 2, fade: 0.10 },
  },
  {
    id: 'masters-pinned',
    who: '48, masters lifter, front squat is the whole point',
    life: 'Wants that lift left alone, thank you',
    answers: {
      goal: 'strength', goalStatement: 'still be lifting at 70',
      customTargets: [{ label: 'Front squat', target: 275, unit: 'lb' }],
      daysPerWeek: 4, equipProfile: 'gym', extraEquip: [], experience: 'trained',
      bodyweightLb: 190, sex: 'male', mealsPerDay: 4,
    },
    prefs: { pinned: ['front-squat', 'goblet-squat'] },
    behaviour: { adherence: 0.93, shortfall: 0.10, hard: 0.26, rir: 1, fade: 0.09 },
  },
  {
    id: 'dj-latenights',
    who: '23, DJs weekends, wants to lean out',
    life: 'Home at 4am Saturday and Sunday',
    answers: {
      goal: 'lean', goalStatement: 'get abs before summer',
      customTargets: [], daysPerWeek: 3, equipProfile: 'home-db', extraEquip: [],
      experience: 'new', bodyweightLb: 178, sex: 'male', mealsPerDay: 3,
      lifeSeeds: [{ label: 'DJ set', kind: 'late-night' }],
    },
    behaviour: { adherence: 0.66, shortfall: 0.20, hard: 0.32, rir: 1, fade: 0.20 },
  },
  {
    id: 'triathlete',
    who: '30, triathlon, lifting is support work',
    life: 'Six days, already tired from swimming and riding',
    answers: {
      goal: 'endurance', goalStatement: 'finish a half ironman',
      customTargets: [{ label: 'Longest run', target: 13.1, unit: 'mi' }],
      daysPerWeek: 6, equipProfile: 'gym', extraEquip: [], experience: 'trained',
      bodyweightLb: 150, sex: 'female', mealsPerDay: 5,
      goalAnswers: { 'race-what': 'Half marathon', 'run-now': '25+ mi', 'race-when': '3 to 6 months' },
    },
    behaviour: { adherence: 0.82, shortfall: 0.16, hard: 0.34, rir: 1, fade: 0.20 },
  },
  {
    id: 'postpartum',
    who: '26, eight months postpartum, coming back',
    life: 'Broken sleep, three short days',
    answers: {
      goal: 'general', goalStatement: 'feel like myself again',
      customTargets: [], daysPerWeek: 3, equipProfile: 'minimal', extraEquip: [],
      experience: 'returning', bodyweightLb: 148, sex: 'female', mealsPerDay: 4,
      lifeSeeds: [{ label: 'Night feeds', kind: 'late-night' }],
    },
    behaviour: { adherence: 0.60, shortfall: 0.25, hard: 0.40, rir: 1, fade: 0.24 },
  },
  {
    id: 'road-warrior',
    who: '33, travels three weeks a month',
    life: 'Hotel rooms, no equipment, four days when lucky',
    answers: {
      goal: 'muscle', goalStatement: 'not lose what I built',
      customTargets: [], daysPerWeek: 4, equipProfile: 'minimal', extraEquip: [],
      experience: 'new', bodyweightLb: 170, sex: 'male', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Red-eye flight', kind: 'late-night' }],
    },
    behaviour: { adherence: 0.52, shortfall: 0.18, hard: 0.28, rir: 2, fade: 0.16 },
  },
  {
    id: 'lineman',
    who: '20, football lineman, wants to be immovable',
    life: 'Five days, eats everything',
    answers: {
      goal: 'strength', goalStatement: 'be the strongest on the line',
      customTargets: [{ label: 'Squat', target: 405, unit: 'lb' }],
      daysPerWeek: 5, equipProfile: 'gym', extraEquip: [], experience: 'returning',
      bodyweightLb: 285, sex: 'male', mealsPerDay: 5,
    },
    behaviour: { adherence: 0.91, shortfall: 0.13, hard: 0.30, rir: 1, fade: 0.12 },
  },
  {
    id: 'new-knee',
    who: '44, eighteen months after a knee replacement',
    life: 'Cleared to train, careful about it',
    answers: {
      goal: 'general', goalStatement: 'walk up hills without thinking about it',
      customTargets: [], daysPerWeek: 3, equipProfile: 'home-db', extraEquip: [],
      experience: 'new', bodyweightLb: 210, sex: 'female', mealsPerDay: 3,
    },
    prefs: { limitations: [{ label: 'replacement, right knee', joints: ['knee'], since: '2026-08-10' }] },
    behaviour: { adherence: 0.75, shortfall: 0.20, hard: 0.30, rir: 2, fade: 0.18 },
  },
]
