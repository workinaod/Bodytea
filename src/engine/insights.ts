import type { AppData, ISODate, Insight, InsightArea, Weekday } from '../types'
import { addDaysISO, daysBetween, mondayOf, weekdayOf, weekIndexFor } from './calendar'
import {
  currentStreak,
  kcalBumpSuggestion,
  liftSeries,
  proteinFor,
  repMaxSeries,
} from './stats'

// ============================================================
// The insight engine: rules that only speak when the DATA says
// something about HIS goals (recomp, vertical, upper chest, lat
// width, 16" arms, consistency). Each rule has a cooldown so the
// same observation never repeats inside its window, and multiple
// phrasings rotated by date so even repeats read fresh.
// ============================================================

interface RuleDef {
  id: string
  area: InsightArea
  priority: number
  cooldownDays: number
  evaluate: (data: AppData, today: ISODate) => Record<string, string | number> | null
  variants: string[]
}

function fmt(n: number, digits = 1): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits)
}

function latestMeasure(data: AppData, key: 'weightLb' | 'waistIn' | 'armsIn' | 'vertIn') {
  const ms = data.measurements.filter((m) => m[key] !== undefined)
  return ms.length ? ms[ms.length - 1] : null
}

function measureAround(
  data: AppData,
  key: 'weightLb' | 'waistIn' | 'armsIn' | 'vertIn',
  beforeDate: ISODate,
  minDaysBack: number,
) {
  const ms = data.measurements.filter(
    (m) => m[key] !== undefined && daysBetween(m.date, beforeDate) >= minDaysBack,
  )
  return ms.length ? ms[ms.length - 1] : null
}

function e1rmGainPct(data: AppData, exerciseId: string, sinceDaysAgo: number, today: ISODate): number | null {
  const series = liftSeries(data, exerciseId)
  if (series.length < 2) return null
  const cutoff = addDaysISO(today, -sinceDaysAgo)
  const before = series.filter((p) => p.date <= cutoff)
  const after = series.filter((p) => p.date > cutoff)
  if (!before.length || !after.length) return null
  const prev = Math.max(...before.map((p) => p.e1rm))
  const now = Math.max(...after.map((p) => p.e1rm))
  if (prev <= 0) return null
  return ((now - prev) / prev) * 100
}

const RULES: RuleDef[] = [
  // ---------------- Recomp ----------------
  {
    id: 'recomp-waist-down',
    area: 'recomp',
    priority: 90,
    cooldownDays: 12,
    evaluate: (data) => {
      const last = latestMeasure(data, 'waistIn')
      if (!last?.waistIn || !last.weightLb) return null
      const base = measureAround(data, 'waistIn', last.date, 18)
      if (!base?.waistIn || !base.weightLb) return null
      const waistDrop = base.waistIn - last.waistIn
      const weightChange = Math.abs((last.weightLb ?? 0) - (base.weightLb ?? 0))
      if (waistDrop >= 0.4 && weightChange <= 2.5) {
        return { drop: fmt(waistDrop), weeks: Math.round(daysBetween(base.date, last.date) / 7) }
      }
      return null
    },
    variants: [
      'Waist down {drop}" over {weeks} weeks at the same bodyweight. That IS the recomp. Flat scale is the design, the tape is the truth.',
      '{drop}" off the waist in {weeks} weeks without losing weight. You\'re trading fat for muscle in real time. The plan calls this exactly right: waist is the metric, not the scale.',
      'Same weight, {drop}" smaller waist since {weeks} weeks ago. This is what "197 turning from kinda-big into clearly-built" looks like in the data.',
    ],
  },
  {
    id: 'recomp-kcal-bump',
    area: 'nutrition',
    priority: 85,
    cooldownDays: 7,
    evaluate: (data) => {
      const s = kcalBumpSuggestion(data)
      if (!s) return null
      return { gain: s.strengthGainPct, change: fmt(s.weightChangeLb) }
    },
    variants: [
      'Check-in rule triggered: strength up {gain}% but the scale moved just {change} lb over 3+ weeks. The plan says add 150-200 kcal to training days. Do it in Settings. This is fuel, not cheating.',
      'Your lifts climbed {gain}% while bodyweight stayed put ({change} lb). Per the plan\'s own rule: bump training days by 150-200 kcal. Recomp is slow; underfueling makes it slower.',
      'Data check: strength +{gain}%, weight {change} lb. The 3-4 week rule says training days get 150-200 more kcal now. The muscle you want has a food bill.',
    ],
  },
  {
    id: 'protein-week-strong',
    area: 'nutrition',
    priority: 40,
    cooldownDays: 10,
    evaluate: (data, today) => {
      let hit = 0
      let logged = 0
      for (let i = 1; i <= 7; i++) {
        const d = addDaysISO(today, -i)
        const p = proteinFor(data, d)
        if (p > 0) logged++
        if (p >= data.settings.proteinTargetG) hit++
      }
      if (logged >= 5 && hit >= 5) return { hit }
      return null
    },
    variants: [
      'Protein target hit {hit} of the last 7 days. The single most important nutrition number, handled. This is the invisible half of every PR.',
      '{hit}/7 days at {proteinTarget}+ g protein this week. The plan said never miss it, and you didn\'t. This is how muscle survives a recomp.',
      'The week\'s protein ledger: {hit} of 7 on target. Boring, repeatable, undefeated. Keep the streak alive.',
    ],
  },
  {
    id: 'protein-week-weak',
    area: 'nutrition',
    priority: 70,
    cooldownDays: 7,
    evaluate: (data, today) => {
      let hit = 0
      let logged = 0
      for (let i = 1; i <= 7; i++) {
        const d = addDaysISO(today, -i)
        const p = proteinFor(data, d)
        if (p > 0) logged++
        if (p >= data.settings.proteinTargetG) hit++
      }
      if (logged >= 4 && hit <= 2) return { hit }
      return null
    },
    variants: [
      'Protein hit only {hit} of the last 7 days. Training tears muscle down; without the {proteinTarget} g it rebuilds at half speed. The shake + Greek yogurt combo closes 50 g in five minutes, no cooking.',
      '{hit}/7 on protein this week. Everything you lifted this week rebuilds slower because of it. Front-load tomorrow: eggs + yogurt at breakfast is 45 g before noon.',
      'The weak link this week wasn\'t training, it was {hit}/7 on protein. Fix breakfast and the number fixes itself.',
    ],
  },

  // ---------------- Athletic ----------------
  {
    id: 'strength-up-vert-flat',
    area: 'athletic',
    priority: 80,
    cooldownDays: 14,
    evaluate: (data, today) => {
      const squat = e1rmGainPct(data, 'front-squat', 28, today) ?? 0
      const thrust = e1rmGainPct(data, 'hip-thrust', 28, today) ?? 0
      const gain = Math.max(squat, thrust)
      if (gain < 5) return null
      const verts = data.measurements.filter((m) => m.vertIn !== undefined)
      if (verts.length < 3) return null
      const last = verts[verts.length - 1].vertIn!
      const old = verts.filter((m) => daysBetween(m.date, today) >= 21)
      if (!old.length) return null
      const base = old[old.length - 1].vertIn!
      if (last - base <= 0.5) return { gain: Math.round(gain) }
      return null
    },
    variants: [
      'Leg strength up {gain}% this month but the vert hasn\'t moved yet. Normal. Strength banks first, elasticity cashes it out. Saturday\'s pogos and approach jumps do the conversion. Do NOT trim them.',
      'Squat/hip thrust +{gain}%, vert flat. The force is there; the spring is still being built. This is exactly why the plan protects Saturday. The elastic work turns gym strength into air.',
      '{gain}% stronger, same jump. For now. The strength arrives weeks before the inches. Keep Saturday quality high and the chart catches up.',
    ],
  },
  {
    id: 'vert-up',
    area: 'athletic',
    priority: 95,
    cooldownDays: 10,
    evaluate: (data) => {
      const verts = data.measurements.filter((m) => m.vertIn !== undefined)
      if (verts.length < 2) return null
      const last = verts[verts.length - 1]
      const base = measureAround(data, 'vertIn', last.date, 21)
      if (!base?.vertIn) return null
      const gain = last.vertIn! - base.vertIn
      if (gain >= 1) return { gain: fmt(gain), weeks: Math.round(daysBetween(base.date, last.date) / 7) }
      return null
    },
    variants: [
      'Vert / rim touch up {gain}" in {weeks} weeks. That\'s not luck. That\'s Monday force work + Saturday elastic work + real Sunday rest. The rim is getting closer on schedule.',
      '+{gain}" of air since {weeks} weeks ago. Every falling start, pogo, and hip thrust bought a piece of that. Consistent dunks are a compounding investment and you just saw a dividend.',
      'The jump chart moved: +{gain}" in {weeks} weeks. Log the next attempts fresh and keep the approach rhythm identical. Height loves repetition.',
    ],
  },
  {
    id: 'onefoot-expectation',
    area: 'athletic',
    priority: 50,
    cooldownDays: 21,
    evaluate: (data, today) => {
      const weeks = weekIndexFor(today, data.settings.phaseStartDate)
      if (weeks > 6) return null
      const hasJumpWork = Object.values(data.sessions).some((s) =>
        s.exercises.some((e) => e.exerciseId === 'approach-jump' || e.exerciseId === 'dunk-attempt'),
      )
      if (!hasJumpWork) return null
      return { weeks }
    },
    variants: [
      'Week {weeks} reminder from your own plan: the one-foot jump feels WEAKER than two-foot at first. Normal. The elasticity takes weeks, then for many converted jumpers it passes the two-foot number. Don\'t judge it in month one.',
      'One-foot plant still mushy in week {weeks}? That\'s the documented curve, not a verdict. Tendon stiffness compounds quietly. Pogos crisp, penultimate step LOW.',
      'Early-phase check (week {weeks}): one-foot jumping is supposed to feel worse than it will. You keep all your run-up speed once the spring stiffens. The plan literally warned you not to quit in the first month.',
    ],
  },
  {
    id: 'explosive-adherence',
    area: 'athletic',
    priority: 60,
    cooldownDays: 14,
    evaluate: (data, today) => {
      // 4+ consecutive weeks with the explosive (Saturday-role) session logged
      let weeks = 0
      for (let i = 1; i <= 8; i++) {
        const monday = mondayOf(addDaysISO(today, -7 * i))
        let done = false
        for (let d = 0; d < 7; d++) {
          const date = addDaysISO(monday, d)
          const s = data.sessions[date]
          if (!s || s.status === 'skipped') continue
          if (s.templateId === 'saturday' || s.templateId === 't3-explosive') done = true
        }
        if (done) weeks++
        else break
      }
      if (weeks >= 4) return { weeks }
      return null
    },
    variants: [
      '{weeks} straight weeks without missing the explosive day, the one you never drop. That streak is the biggest reason the speed and jump numbers keep moving.',
      'The explosive session has survived {weeks} consecutive weeks of real life. Most people cut it first and lose it fastest. You\'re doing the exact opposite of most people.',
      '{weeks} weeks of uninterrupted speed work. Elasticity is use-it-or-lose-it and you keep choosing "use it". The vert chart is downstream of this streak.',
    ],
  },

  // ---------------- Physique ----------------
  {
    id: 'incline-progress',
    area: 'physique',
    priority: 65,
    cooldownDays: 14,
    evaluate: (data, today) => {
      const gain = e1rmGainPct(data, 'incline-db-press', 42, today)
      if (gain === null || gain < 5) return null
      return { gain: Math.round(gain) }
    },
    variants: [
      'Incline press up {gain}% over six weeks. Upper chest is a stated goal and it grows from exactly this: incline volume, progressed. First exercise every Tuesday, doing its job.',
      '+{gain}% on the incline. The upper-chest shelf you\'re after is built pound by pound on that bench. The chart says the bricks are being laid.',
      'The incline e1RM climbed {gain}%. That\'s the "big upper chest" goal turning into weight on a dumbbell.',
    ],
  },
  {
    id: 'pullup-progress',
    area: 'physique',
    priority: 65,
    cooldownDays: 14,
    evaluate: (data, today) => {
      const series = repMaxSeries(data, 'pull-up')
      if (series.length < 2) return null
      const cutoff = addDaysISO(today, -28)
      const before = series.filter((p) => p.date <= cutoff)
      const after = series.filter((p) => p.date > cutoff)
      if (!before.length || !after.length) return null
      const prev = Math.max(...before.map((p) => p.reps))
      const now = Math.max(...after.map((p) => p.reps))
      if (now >= prev + 2) return { now, prev }
      return null
    },
    variants: [
      'Pull-up max: {prev} → {now}. Lat WIDTH gets built on that bar. The V-taper is a rep count wearing a t-shirt.',
      '{now} pull-ups, up from {prev} a month ago. Every added rep is added back width. Wide-grip, dead-hang, honest, and climbing.',
      'From {prev} to {now} on pull-ups. That\'s the clearest lat-growth signal there is, and it\'s free bodyweight data. Width incoming.',
    ],
  },
  {
    id: 'arms-near-target',
    area: 'physique',
    priority: 55,
    cooldownDays: 21,
    evaluate: (data) => {
      const last = latestMeasure(data, 'armsIn')
      if (!last?.armsIn) return null
      const gap = 16 - last.armsIn
      if (gap > 0 && gap <= 0.5) return { arms: fmt(last.armsIn), gap: fmt(gap) }
      return null
    },
    variants: [
      'Arms at {arms}", {gap}" from the 16" target. Close-grip pressing, twice-weekly curls, progressive load. The last half-inch is patience with the same recipe.',
      '{arms}" measured. The 16" line is {gap}" away and the curl volume is already in the program. Keep eating; arms are built at dinner too.',
      'Tape says {arms}". {gap}" to the goal. No changes needed. The EZ curls and close-grip work carry you there if protein stays at 200.',
    ],
  },

  // ---------------- Consistency ----------------
  {
    id: 'streak-strong',
    area: 'consistency',
    priority: 45,
    cooldownDays: 10,
    evaluate: (data, today) => {
      const streak = currentStreak(data, today)
      if (streak >= 10) return { streak }
      return null
    },
    variants: [
      '{streak} scheduled sessions in a row, zero missed. Across a year, THIS stat predicts the physique better than any single PR.',
      'Streak: {streak}. The plan\'s whole thesis is "consistency across a year is the whole game". You\'re currently the proof.',
      '{streak} straight. Motivation didn\'t do that; the habit did. Guard it like it\'s a max attempt, because it is one.',
    ],
  },
  {
    id: 'attendance-slipping',
    area: 'consistency',
    // Above the recovery and nutrition problems, below the goal-progress
    // signals. Somebody who is not training does not have a sleep problem
    // or a protein problem worth solving first, but a genuine jump PR is
    // still the better thing to lead with. Only the top two insights ever
    // reach the debrief, so this number is the difference between a rule
    // that speaks and a rule that exists.
    priority: 78,
    cooldownDays: 14,
    /**
     * The one thing nobody was told.
     *
     * Sixteen rules watched protein, sleep, waistlines, vertical jumps and
     * whether a deload was respected. Attendance had two, and both of them
     * only ever spoke when it was going well. An athlete who quietly does
     * half their sessions for two months got PRs celebrated, complete weeks
     * congratulated, and total silence about the half that did not happen.
     *
     * Everything that DOES respond to a missed day needs the athlete to
     * come and say so first: the reconcile flow, the tier change, the
     * make-up. Somebody drifting away does not open the app to file a
     * reason. They just stop, and the last thing the app ever said to them
     * was well done.
     */
    evaluate: (data, today) => {
      // Not counting the first fortnight: a new plan has too few scheduled
      // days behind it for a ratio to mean anything.
      if (daysBetween(data.settings.phaseStartDate, today) < 21) return null
      let scheduled = 0
      let trained = 0
      for (let i = 1; i <= 28; i++) {
        const d = addDaysISO(today, -i)
        if (d < data.settings.phaseStartDate) continue
        if (!scheduledTrainingDay(data, d)) continue
        scheduled++
        const log = data.sessions[d]
        if (log && log.status !== 'skipped') trained++
      }
      if (scheduled < 8) return null
      const pct = Math.round((trained / scheduled) * 100)
      if (pct >= 65) return null
      return { done: trained, scheduled, pct, missed: scheduled - trained }
    },
    variants: [
      '{done} of {scheduled} sessions over the last month. Not a lecture: {pct}% is enough to hold ground and not quite enough to build on it. If the week is the problem rather than the training, the Week tab moves days around, and a lighter tier still counts.',
      'The last four weeks came out at {done} of {scheduled}. The sessions you did do are logged and they count. The question worth answering is whether {scheduled} a week was ever the right number, because a smaller plan you finish beats a bigger one you do not.',
      'You have missed {missed} of the last {scheduled} scheduled sessions. That usually means life changed rather than that you stopped caring. Drop a tier for a week, or move the days: both are in the app and both keep the streak honest.',
    ],
  },
  {
    id: 'deload-respected',
    area: 'consistency',
    priority: 55,
    cooldownDays: 20,
    evaluate: (data, today) => {
      // In week 1 of a block, check the previous (deload) week was actually done lighter
      const { weekInBlock } = blockMathLocal(data, today)
      if (weekInBlock !== 1) return null
      const prevMonday = mondayOf(addDaysISO(today, -7))
      let deloadSessions = 0
      for (let d = 0; d < 7; d++) {
        const s = data.sessions[addDaysISO(prevMonday, d)]
        if (s && s.status !== 'skipped') deloadSessions++
      }
      if (deloadSessions >= 2) return { n: deloadSessions }
      return null
    },
    variants: [
      'Deload week completed as written ({n} sessions, half volume). New block starts NOW. This is where the PRs usually land. Chase them.',
      'You actually deloaded instead of sneaking extra sets. Rarer than it sounds. Expect the bar to feel suspiciously light this week.',
      'Fresh block on a real deload. The plan promises "you\'ll often hit new numbers right after". This week is the collection window.',
    ],
  },

  // ---------------- Recovery ----------------
  {
    id: 'bad-sleep-cluster',
    area: 'recovery',
    priority: 75,
    cooldownDays: 10,
    evaluate: (data, today) => {
      let count = 0
      for (const week of Object.values(data.weeks)) {
        for (const d of week.badSleepDates) {
          if (daysBetween(d, today) >= 0 && daysBetween(d, today) <= 14) count++
        }
      }
      if (count >= 3) return { count }
      return null
    },
    variants: [
      '{count} flagged short-sleep nights in two weeks. Sleep is where jumps are built and hamstrings are repaired. Whatever is stealing the nights is also taxing the goals. Treat bedtime like a session.',
      'The sleep ledger shows {count} bad nights in 14 days. Under-slept speed work is how hamstrings tear. Protect two nights this week: before Monday and before Saturday.',
      '{count} rough nights logged recently. No training tweak fixes chronic short sleep. Pick the earliest realistic bedtime tonight and defend it like a PR attempt.',
    ],
  },
  {
    id: 'readiness-gig-pattern',
    area: 'recovery',
    priority: 70,
    cooldownDays: 21,
    evaluate: (data, today) => {
      let gigDowngrades = 0
      for (const s of Object.values(data.sessions)) {
        if (!s.readiness?.downgraded) continue
        if (daysBetween(s.date, today) > 21 || daysBetween(s.date, today) < 0) continue
        const monday = mondayOf(s.date)
        const week = data.weeks[monday]
        if (!week) continue
        const wd = weekdayOf(s.date)
        const prevWd = ((wd + 6) % 7) as Weekday
        const prevWeek = wd === 1 ? data.weeks[mondayOf(addDaysISO(s.date, -1))] : week
        const hit = (w: typeof week, d: Weekday) =>
          !!w && Object.values(w.events).some((days) => days?.includes(d))
        if (hit(week, wd) || hit(prevWeek, prevWd)) gigDowngrades++
      }
      if (gigDowngrades >= 2) return { count: gigDowngrades }
      return null
    },
    variants: [
      'Pattern detected: {count} readiness downgrades landed right after gigs this month. The data agrees: gig legs are real training load. Consider pushing those weeks\' CNS days a day later.',
      '{count} CNS days got downgraded after gig nights recently. Not a willpower issue, a scheduling collision. Move sessions in the Week tab before the gig, not after.',
      'The logs say gigs cost you {count} quality speed days this month. Plan around them like an away game: session in the morning, or shifted a day.',
    ],
  },

  // ---------------- Logging hygiene ----------------
  {
    id: 'meals-unlogged',
    area: 'nutrition',
    priority: 35,
    cooldownDays: 7,
    evaluate: (data, today) => {
      // Only days the app was actually here for.
      //
      // Every other rule in this file asks whether logged data shows a
      // pattern, so an empty history simply fails them. This one asks the
      // opposite question, and a day before installation looks exactly
      // like a day somebody could not be bothered. Unclamped, the very
      // first debrief a new athlete ever sees opened by telling them
      // their food log had gone dark for seven days.
      const lived = Math.min(7, Math.max(0, daysBetween(data.settings.installedAt, today)))
      let empty = 0
      for (let i = 1; i <= lived; i++) {
        if ((data.meals[addDaysISO(today, -i)]?.entries.length ?? 0) === 0) empty++
      }
      if (empty >= 4) return { empty }
      return null
    },
    variants: [
      '{empty} of the last 7 days have zero meals logged. I can\'t coach what you don\'t log, and protein can\'t be "probably fine". The meal chips take seconds.',
      'Food log went dark {empty} days this week. The recomp runs on the {proteinTarget} g number and right now it\'s unverifiable. One tap per meal, that\'s the whole ask.',
      '{empty} blank food days. If logging feels heavy, use only the big meal chips, five taps covers a whole day. Data in, insight out.',
    ],
  },
]

/**
 * Was `date` a day the plan asked for, at the tier that week was run at?
 *
 * A local copy for the same reason blockMathLocal is one, and tier-aware
 * on purpose: dropping to tier 2 for a hard week is a sanctioned move the
 * app offers, and counting that week's untrained tier-1 days as misses
 * would tell somebody off for taking the option the app gave them.
 */
function scheduledTrainingDay(data: AppData, date: ISODate): boolean {
  const plan = data.plan
  const weekday = weekdayOf(date)
  const week = data.weeks[mondayOf(date)]
  const tier = week?.tier ?? 1
  if (tier === 1) return !!plan.tier1ByWeekday[weekday]
  const placement = { ...plan.tierDefaultPlacement[tier], ...(week?.tierPlacement ?? {}) }
  return Object.values(placement).includes(weekday)
}

// small local copy to avoid circular import with resolveDay's heavier deps
function blockMathLocal(data: AppData, today: ISODate) {
  const weekIndex = weekIndexFor(today, data.settings.phaseStartDate)
  const weekInBlock = (((weekIndex - 1) % 4) + 1) as 1 | 2 | 3 | 4
  return { weekIndex, weekInBlock }
}

/** Deterministic variant rotation by date so repeats read differently. */
function variantFor(rule: RuleDef, today: ISODate): string {
  const seed = daysBetween('2026-01-05', today)
  return rule.variants[((seed % rule.variants.length) + rule.variants.length) % rule.variants.length]
}

export function generateInsights(data: AppData, today: ISODate): Insight[] {
  const out: Insight[] = []
  for (const rule of RULES) {
    const lastShown = data.coach.surfacedInsights[rule.id]
    if (lastShown && daysBetween(lastShown, today) < rule.cooldownDays) continue
    let vars: Record<string, string | number> | null = null
    try {
      vars = rule.evaluate(data, today)
    } catch {
      vars = null
    }
    if (!vars) continue
    const allVars: Record<string, unknown> = {
      proteinTarget: data.settings.proteinTargetG,
      goalPhrase: data.plan.goalStatement,
      ...vars,
    }
    const text = variantFor(rule, today).replace(/\{(\w+)\}/g, (_, k: string) =>
      k in allVars ? String(allVars[k]) : `{${k}}`,
    )
    out.push({
      ruleId: rule.id,
      area: rule.area,
      priority: rule.priority,
      cooldownDays: rule.cooldownDays,
      text,
    })
  }
  return out.sort((a, b) => b.priority - a.priority)
}

export const INSIGHT_RULE_IDS = RULES.map((r) => r.id)
