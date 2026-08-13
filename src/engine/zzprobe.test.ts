import { describe, it } from 'vitest'
import { emptyAppData, defaultWeekState, type AppData, type EquipTag } from '../types'
import { resolveDay } from './resolveDay'
import { readSignals, planAdjustments, twoConsecutiveBadNightsBefore } from './adapt'
import { minimumViableFor } from './transforms'
import { getTemplate } from '../plan/templates'
import { addDaysISO, mondayOf } from './calendar'
import { canDo } from '../plan/equip'
import { substitutesFor } from '../plan/movement'

const START = '2026-08-10' // Monday, week 1, block 1, A week

function base(equipment?: EquipTag[]): AppData {
  const d = emptyAppData(START)
  d.settings.onboarded = true
  if (equipment) d.plan = { ...d.plan, equipment }
  return d
}

const DAYS = [
  ['2026-08-10', 'Mon'],
  ['2026-08-11', 'Tue'],
  ['2026-08-12', 'Wed'],
  ['2026-08-13', 'Thu'],
  ['2026-08-14', 'Fri'],
  ['2026-08-15', 'Sat'],
] as const

function dump(label: string, d: AppData) {
  console.log(`\n########## ${label} ##########`)
  for (const [date, name] of DAYS) {
    const r = resolveDay(date, d)
    console.log(
      `-- ${name} ${date} [${r.title}] cns=${r.cns} kind=${r.kind}\n   ` +
        r.exercises.map((e) => `${e.exerciseId}x${e.sets}${e.swappedFrom ? `(<-${e.swappedFrom})` : ''}${e.lightMode ? '[light]' : ''}`).join(', '),
    )
    for (const b of r.banners) console.log(`   BANNER ${b.id}: ${b.text.slice(0, 150)}`)
  }
}

describe('probe', () => {
  it('S1 dumbbells only for a week', () => {
    dump('BASELINE full gym (preset equipment)', base())
    dump('DUMBBELLS + BENCH ONLY', base(['dumbbell', 'bench', 'open-space']))
    dump('DUMBBELLS ONLY (no bench)', base(['dumbbell']))
  })

  it('S2 travelling with nothing', () => {
    dump('NOTHING AT ALL (equipment: [])', base([]))
  })

  it('S3 twenty minutes', () => {
    const d = base()
    for (const [date, name] of DAYS) {
      const r = resolveDay(date, d)
      if (!r.templateId) continue
      const t = getTemplate(r.templateId)
      const mv = minimumViableFor(t, r.exercises)
      const fullSets = r.exercises.reduce((n, e) => n + e.sets, 0)
      console.log(
        `${name}: full=${r.exercises.length} movements / ${fullSets} sets -> minViable "${mv.label}" = ` +
          mv.exercises.map((e) => `${e.exerciseId}x${e.sets}`).join(', '),
      )
    }
  })

  it('S4 night shift (on-feet every day) + late-night every day', () => {
    const d = base()
    d.weeks[START] = defaultWeekState(START)
    d.weeks[START].events = { shift: [0, 1, 2, 3, 4, 5, 6] }
    dump('NIGHT SHIFT: on-feet event every weekday', d)

    const e = base()
    e.weeks[START] = defaultWeekState(START)
    e.weeks[START].events = { dj: [0, 1, 2, 3, 4, 5, 6] }
    dump('FLIPPED SLEEP: late-night event every weekday', e)
  })

  it('S5 gig to 2am before a CNS day', () => {
    // Friday gig, pushed to Saturday (the plan's own owner rule)
    const d = base()
    d.weeks[START] = defaultWeekState(START)
    d.weeks[START].events = { dj: [5] }
    d.weeks[START].friPushedToSat = true
    dump('DJ FRIDAY -> pushed to Saturday (Sat is the CNS speed day)', d)

    // Same, without the push
    const e = base()
    e.weeks[START] = defaultWeekState(START)
    e.weeks[START].events = { dj: [5] }
    dump('DJ FRIDAY, no push', e)

    // Sunday-night gig before Monday CNS power day
    const f = base()
    f.weeks[addDaysISO(START, -7)] = defaultWeekState(addDaysISO(START, -7))
    f.weeks[addDaysISO(START, -7)].events = { dj: [0] } // Sunday 2026-08-09
    f.weeks[START] = defaultWeekState(START)
    const mon = resolveDay(START, f)
    console.log('\n### Sunday gig -> Monday CNS power day')
    console.log('   ', mon.exercises.map((e2) => `${e2.exerciseId}x${e2.sets}`).join(', '))
    for (const b of mon.banners) console.log(`   BANNER ${b.id}: ${b.text.slice(0, 160)}`)

    // Gig marked ON the CNS day itself
    const g = base()
    g.weeks[START] = defaultWeekState(START)
    g.weeks[START].events = { dj: [6] }
    const sat = resolveDay('2026-08-15', g)
    console.log('\n### Gig marked on Saturday itself (CNS speed day)')
    console.log('   ', sat.exercises.map((e2) => `${e2.exerciseId}x${e2.sets}`).join(', '))
    for (const b of sat.banners) console.log(`   BANNER ${b.id}: ${b.text.slice(0, 160)}`)
  })

  it('S6 new baby: a month of broken sleep', () => {
    const d = base()
    // Flag every night for 35 days up to Wed 2026-09-16
    const today = '2026-09-16' // Wednesday
    for (let i = 1; i <= 40; i++) {
      const day = addDaysISO(today, -i)
      const mon = mondayOf(day)
      d.weeks[mon] ??= defaultWeekState(mon)
      d.weeks[mon].badSleepDates.push(day)
    }
    const monToday = mondayOf(today)
    d.weeks[monToday] ??= defaultWeekState(monToday)

    console.log('\n### 40 consecutive flagged bad nights, today = Wed 2026-09-16')
    console.log('signals:', JSON.stringify(readSignals(d, today), null, 1))
    console.log('twoConsecutiveBadNightsBefore(Wed):', twoConsecutiveBadNightsBefore(d, today))

    const wed = resolveDay(today, d)
    console.log('WED:', wed.title, wed.exercises.map((e) => `${e.exerciseId}x${e.sets}${e.lightMode ? '[light]' : ''}`).join(', '))
    for (const b of wed.banners) console.log(`   BANNER ${b.id}: ${b.text.slice(0, 160)}`)

    // The same on a Monday (cross-week read)
    const monday = '2026-09-14'
    console.log('\ntwoConsecutiveBadNightsBefore(Mon 2026-09-14):', twoConsecutiveBadNightsBefore(d, monday))
    const mon2 = resolveDay(monday, d)
    console.log('MON:', mon2.title, mon2.exercises.map((e) => `${e.exerciseId}x${e.sets}${e.lightMode ? '[light]' : ''}`).join(', '))
    for (const b of mon2.banners) console.log(`   BANNER ${b.id}: ${b.text.slice(0, 160)}`)

    // Proposals offered
    const props = planAdjustments(wed.exercises, {
      owned: new Set<EquipTag>(['none', ...d.plan.equipment]),
      signals: readSignals(d, today),
      alreadyCutForSleep: twoConsecutiveBadNightsBefore(d, today),
    })
    console.log('PROPOSALS on Wed:', JSON.stringify(props, null, 1))

    // Compare week 1 vs week 5 of broken sleep: does anything escalate?
    const early = '2026-08-20'
    console.log('\nsignals after 3 nights (early):', JSON.stringify(readSignals(d, early).map((s) => `${s.kind}:${s.count}`)))
  })

  it('S1b what a missing-equipment movement with no substitute does', () => {
    const d = base([])
    const nothing = new Set<EquipTag>(['none'])
    for (const day of DAYS) {
      const full = resolveDay(day[0], base())
      const adj = planAdjustments(full.exercises, { owned: nothing, signals: [] })
      const swapped = new Set(adj.filter((a) => a.kind === 'substitute').map((a) => a.exerciseId))
      const orphans = full.exercises.filter(
        (e) => !swapped.has(e.exerciseId) && !canDo(e.exerciseId, nothing),
      )
      console.log(
        `${day[1]}: undoable-with-nothing and NOT swapped -> [${orphans.map((o) => o.exerciseId).join(', ')}]`,
      )
      for (const o of orphans) {
        console.log(`     ${o.exerciseId}: substitutesFor -> [${substitutesFor(o.exerciseId, { can: (x) => canDo(x, nothing) }).join(', ')}]`)
      }
    }
    void d
  })
})
