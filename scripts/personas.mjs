#!/usr/bin/env node
// ============================================================
// Generate real plans for real-shaped people, and print them.
//
// The point is to evaluate what the engine ACTUALLY emits rather
// than what the source looks like it should emit. Every persona
// here is a combination somebody would really arrive with: a
// goal, a training age, the room they actually train in, the
// days they actually have, and the life that eats those days.
//
// Run: npx tsx scripts/personas.mjs > /tmp/plans.txt
// ============================================================

export const PERSONAS = [
  {
    id: 'dunk-novice',
    who: '19, never trained, wants to dunk. Full gym, 4 days.',
    answers: {
      goal: 'vertical', goalStatement: 'dunk on a 10-ft rim',
      customTargets: [{ label: 'Vert', target: 30, unit: 'in' }],
      daysPerWeek: 4, equipProfile: 'gym', extraEquip: [], experience: 'new',
      bodyweightLb: 165, sex: 'male', mealsPerDay: 4,
      goalAnswers: { 'vert-now': 'Not close yet', 'jump-history': 'Never', 'vert-missing': 'Not sure' },
    },
  },
  {
    id: 'fat-loss-desk',
    who: '38, desk job, 60 lb to lose, home dumbbells, 3 days.',
    answers: {
      goal: 'lean', goalStatement: 'lose 60 lb and keep it off',
      customTargets: [{ label: 'Bodyweight', target: 190, unit: 'lb' }],
      daysPerWeek: 3, equipProfile: 'home-db', extraEquip: [], experience: 'new',
      bodyweightLb: 250, sex: 'male', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Desk job', kind: 'on-feet' }],
      goalAnswers: { 'lose-amount': '30+ lb', 'food-struggle': 'Late-night eating', 'day-activity': 'Mostly sitting' },
    },
  },
  {
    id: 'marathon-first',
    who: '31, runs 12 mi/wk, first marathon in 6 months. Minimal kit, 4 days.',
    answers: {
      goal: 'endurance', goalStatement: 'finish my first marathon',
      customTargets: [{ label: 'Longest run', target: 26.2, unit: 'mi' }],
      daysPerWeek: 4, equipProfile: 'minimal', extraEquip: [], experience: 'returning',
      bodyweightLb: 155, sex: 'female', mealsPerDay: 4,
      goalAnswers: { 'race-what': 'Marathon', 'run-now': '10 to 25 mi', 'race-when': '3 to 6 months' },
    },
  },
  {
    id: 'strength-intermediate',
    who: '27, 3 years lifting, wants a 315 squat. Full gym, 5 days.',
    answers: {
      goal: 'strength', goalStatement: 'squat 315 for reps',
      customTargets: [{ label: 'Front Squat', target: 315, unit: 'lb' }],
      daysPerWeek: 5, equipProfile: 'gym', extraEquip: [], experience: 'trained',
      bodyweightLb: 190, sex: 'male', mealsPerDay: 4,
      goalAnswers: { 'lift-focus': 'Squat', 'maxes-known': 'Yes', 'bar-years': '3+ years' },
    },
  },
  {
    id: 'muscle-skinny',
    who: '22, skinny, wants 20 lb of muscle. Home dumbbells only, 4 days.',
    answers: {
      goal: 'muscle', goalStatement: 'put on 20 lb of muscle',
      customTargets: [{ label: 'Bodyweight', target: 175, unit: 'lb' }],
      daysPerWeek: 4, equipProfile: 'home-db', extraEquip: [], experience: 'new',
      bodyweightLb: 145, sex: 'male', mealsPerDay: 5,
      goalAnswers: { 'gain-amount': '20 lb', 'appetite': 'Struggle to eat enough', 'sleep-hours': 'Under 6 h' },
    },
  },
  {
    id: 'shift-nurse',
    who: '34, night-shift nurse, general health, minimal kit, 3 days.',
    answers: {
      goal: 'general', goalStatement: 'get my energy back',
      customTargets: [], daysPerWeek: 3, equipProfile: 'minimal', extraEquip: [],
      experience: 'returning', bodyweightLb: 165, sex: 'female', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Night shift', kind: 'late-night' }, { label: 'On-feet shift', kind: 'on-feet' }],
      goalAnswers: { 'general-what': 'Energy', 'day-activity': 'On my feet', 'streak-killer': 'Energy' },
    },
  },
  {
    id: 'speed-athlete',
    who: '17, footballer, wants a faster 40. Full gym, 5 days.',
    answers: {
      goal: 'speed', goalStatement: 'run a faster 40',
      customTargets: [], daysPerWeek: 5, equipProfile: 'gym', extraEquip: [],
      experience: 'returning', bodyweightLb: 180, sex: 'male', mealsPerDay: 4,
      goalAnswers: { 'sprint-feel': 'Smooth', 'sprint-space': 'Yes', 'speed-for': 'My sport' },
    },
  },
  {
    id: 'bodyweight-only',
    who: '45, travels constantly, nothing but a floor. 4 days.',
    answers: {
      goal: 'general', goalStatement: 'stay strong while I travel',
      customTargets: [], daysPerWeek: 4, equipProfile: 'minimal', extraEquip: [],
      experience: 'trained', bodyweightLb: 175, sex: 'male', mealsPerDay: 3,
      lifeSeeds: [{ label: 'Travel week', kind: 'travel' }],
    },
  },
  {
    id: 'postpartum',
    who: '33, 6 months postpartum, up nights, home dumbbells, 3 days.',
    answers: {
      goal: 'lean', goalStatement: 'feel like myself again',
      customTargets: [{ label: 'Waist', target: 30, unit: 'in' }],
      daysPerWeek: 3, equipProfile: 'home-db', extraEquip: [], experience: 'returning',
      bodyweightLb: 160, sex: 'female', mealsPerDay: 4,
      lifeSeeds: [{ label: 'Up with the kids', kind: 'late-night' }],
      goalAnswers: { 'lose-amount': '15 to 30 lb', 'food-struggle': 'Snacking', 'day-activity': 'Pretty active' },
    },
  },
  {
    id: 'masters-strength',
    who: '58, lifted for decades, wants to keep it. Full gym, 3 days.',
    answers: {
      goal: 'strength', goalStatement: 'still be lifting at 70',
      customTargets: [], daysPerWeek: 3, equipProfile: 'gym', extraEquip: [],
      experience: 'trained', bodyweightLb: 200, sex: 'male', mealsPerDay: 3,
      goalAnswers: { 'lift-focus': 'All of them', 'maxes-known': 'Roughly', 'bar-years': '3+ years' },
    },
  },
  {
    id: 'hybrid-6day',
    who: '25, wants to be an all-round athlete. Full gym, 6 days.',
    answers: {
      goal: 'general', goalStatement: 'be an all-around athlete',
      customTargets: [], daysPerWeek: 6, equipProfile: 'gym', extraEquip: [],
      experience: 'returning', bodyweightLb: 175, sex: 'male', mealsPerDay: 4,
      goalAnswers: { 'general-what': 'All of it', 'day-activity': 'Pretty active', 'streak-killer': 'Boredom' },
    },
  },
  {
    id: 'vegan-cut-minimal',
    who: '29, vegan, cutting, one kettlebell and a pull-up bar. 4 days.',
    answers: {
      goal: 'lean', goalStatement: 'get to 12% body fat',
      customTargets: [{ label: 'Body fat', target: 12, unit: '%' }],
      daysPerWeek: 4, equipProfile: 'minimal', extraEquip: ['kettlebell', 'pullup-bar'],
      experience: 'returning', bodyweightLb: 185, sex: 'male', mealsPerDay: 4,
      dietStyle: 'vegan',
      goalAnswers: { 'lose-amount': 'Under 15 lb', 'food-struggle': 'Portions', 'day-activity': 'Mostly sitting' },
    },
  },
]
