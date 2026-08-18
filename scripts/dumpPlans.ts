// ============================================================
// Print what the engine actually builds, for a dozen real people.
//
// Not a test. A readable dump of the generated week, the
// nutrition, the rationale copy and the first month of resolved
// days, so a coach could read it and say whether it is any good.
//
//   npx vite-node scripts/dumpPlans.ts [outfile]
// ============================================================
import { writeFileSync } from 'node:fs'
import { PERSONAS } from './personas.mjs'
import { generatePlan, type OnboardingAnswers } from '../src/plan/generator'
import { emptyAppData, defaultWeekState, type AppData } from '../src/types'
import { resolveDay } from '../src/engine/resolveDay'
import { nutritionDayType, kcalTargetFor } from '../src/engine/dayType'
import { addDaysISO, mondayOf } from '../src/engine/calendar'
import { buildJourney } from '../src/engine/journey'
import { macroTargets } from '../src/plan/sportsNutrition'

const START = '2026-01-05'

function dumpPersona(p: (typeof PERSONAS)[number]): string {
  const out: string[] = []
  const say = (s = '') => out.push(s)

  const gen = generatePlan(p.answers as unknown as OnboardingAnswers)
  const plan = gen.plan

  say(`${'='.repeat(72)}`)
  say(`PERSONA ${p.id} — ${p.who}`)
  say(`stated goal: "${p.answers.goalStatement}"`)
  say(`${'='.repeat(72)}`)
  say(`booklet: ${plan.name}   goal=${plan.goal}  days=${plan.daysPerWeek}  equip=[${plan.equipment.join(', ')}]`)
  say(`protein target: ${gen.proteinTargetG} g   kcal train/rest: ${plan.nutrition.kcalTraining}/${plan.nutrition.kcalRest}`)
  const mt = macroTargets({
    bodyweightLb: p.answers.bodyweightLb,
    kcal: plan.nutrition.kcalTraining,
    protein: 'hypertrophy',
    load: 'moderate',
  })
  say(`macros (training day): ${mt.proteinG}p / ${mt.carbsG}c / ${mt.fatG}f`)
  say()
  say('--- STRATEGY (what the app says it is doing) ---')
  for (const s of gen.strategy) say(`  • ${s}`)
  say()

  say('--- THE WEEK AS WRITTEN ---')
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (let d = 0; d < 7; d++) {
    const tid = plan.tier1ByWeekday[d as 0 | 1 | 2 | 3 | 4 | 5 | 6]
    if (!tid) {
      say(`  ${WD[d]}: rest`)
      continue
    }
    const t = plan.templates[tid]
    say(`  ${WD[d]}: ${t.title} — ${t.tagline}${t.cns ? '  [CNS day]' : ''}`)
  }
  say()

  // Resolve four weeks so block changes and deloads are visible.
  const data: AppData = emptyAppData(START, START, plan)
  data.settings.onboarded = true
  data.settings.proteinTargetG = gen.proteinTargetG
  for (let w = 0; w < 5; w++) data.weeks[mondayOf(addDaysISO(START, w * 7))] = defaultWeekState(mondayOf(addDaysISO(START, w * 7)))

  say('--- FOUR WEEKS RESOLVED (block math, deloads, actual prescriptions) ---')
  for (let w = 0; w < 4; w++) {
    say(`  WEEK ${w + 1}`)
    for (let d = 0; d < 7; d++) {
      const date = addDaysISO(START, w * 7 + d)
      const r = resolveDay(date, data)
      if (r.kind === 'rest') continue
      const head = `    ${WD[new Date(date + 'T12:00:00').getDay()]} ${r.kind}${r.title ? ` · ${r.title}` : ''}`
      say(head)
      for (const ex of r.exercises ?? []) {
        say(`        ${ex.name.padEnd(30)} ${ex.sets} x ${ex.repText}`)
      }
      for (const n of r.notes ?? []) say(`        note: ${n}`)
    }
    const dt = nutritionDayType(addDaysISO(START, w * 7 + 1), data)
    say(`    (Mon nutrition: ${dt}, ${kcalTargetFor(data, dt)} kcal)`)
  }
  say()

  say('--- WHY EACH MOVE IS IN THEIR PLAN (rationale copy) ---')
  const seen = new Set<string>()
  for (const [id, why] of Object.entries(plan.rationale).slice(0, 10)) {
    if (seen.has(id)) continue
    seen.add(id)
    say(`  ${id}: ${why}`)
  }
  say()

  say('--- THE CLIMB (stages the athlete is shown) ---')
  const j = buildJourney(data, START)
  for (const s of j.path.slice(0, 12)) {
    const eta = s.etaWeeks !== undefined ? `~${s.etaWeeks}w (${s.basis})` : s.blocker ? `LOCKED: ${s.blocker}` : (s.note ?? 'no date')
    say(`  [${s.state.padEnd(6)}] ${s.isGoal ? '★ ' : '  '}${s.label.padEnd(28)} ${eta}`)
  }
  say()

  say('--- MEALS ---')
  for (const m of plan.mealPlan.templates.filter((t) => t.dayType === 'training')) {
    say(`  ${m.slot.padEnd(12)} ${m.name.padEnd(28)} ${m.proteinG}p ${m.kcal}kcal`)
    say(`               ${m.detail}`)
  }
  say()
  return out.join('\n')
}

const out = process.argv[2] ?? '/tmp/plans.txt'
const all = PERSONAS.map(dumpPersona).join('\n\n')
writeFileSync(out, all)
console.log(`wrote ${all.split('\n').length} lines for ${PERSONAS.length} personas to ${out}`)
