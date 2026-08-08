import type { AppData, DebriefData, ISODate, SessionLog } from '../types'
import { EAT_NOW, RECOVERY_POOLS, SLEEP_TIPS } from '../plan/debrief'
import { addDaysISO, formatDayLabel } from './calendar'
import { interpolate, pickVariant } from './coach'
import { generateInsights } from './insights'
import { kcalTargetFor, nutritionDayType, recoveryPoolKey, resolveDay } from './resolveDay'
import { detectPRs, kcalFor, proteinFor, sessionSetsDone, sessionTonnage, currentStreak } from './stats'

// ============================================================
// Composes the post-session debrief: live recap numbers first,
// data-driven insights next, rotated pool content as filler.
// Returns the debrief plus the shown-ids to persist for
// anti-repeat.
// ============================================================

export interface ComposedDebrief {
  debrief: DebriefData
  shownIds: string[]
  surfacedInsightIds: string[]
  prNames: string[]
}

export function composeDebrief(
  data: AppData,
  session: SessionLog,
  today: ISODate,
): ComposedDebrief {
  const resolved = resolveDay(session.date, data)
  const shownIds: string[] = []
  const surfacedInsightIds: string[] = []
  let shownAcc = data.coach.shownMessageIds

  const take = (poolId: string, pool: string[], vars: Record<string, string | number> = {}) => {
    const picked = pickVariant(poolId, pool, shownAcc)
    shownIds.push(picked.shownId)
    shownAcc = [...shownAcc, picked.shownId]
    return interpolate(picked.text, vars)
  }

  // ---- Recap ----
  const recap: string[] = []
  const { done, total } = sessionSetsDone(session)
  if (total > 0) recap.push(`${done}/${total} sets completed.`)
  const tonnage = sessionTonnage(session)
  if (tonnage > 0) recap.push(`${tonnage.toLocaleString()} lb moved across the session.`)
  const prs = detectPRs(data, session)
  for (const pr of prs) {
    recap.push(
      pr.kind === 'e1rm'
        ? `PR: ${pr.name} — est. 1RM ${pr.value} lb (was ${pr.prev}).`
        : `PR: ${pr.name} — ${pr.value} reps (was ${pr.prev}).`,
    )
  }
  const streak = currentStreak(data, today)
  if (streak >= 2) recap.push(`Streak: ${streak} scheduled days without a miss.`)
  if (session.readiness?.downgraded)
    recap.push('Trained on a downgraded day — showing up smaller beats not showing up. Correct call.')
  if (session.trimmedFromIndex !== undefined)
    recap.push('Ran long and cut from the bottom — exactly the right way to trim.')

  // ---- Insights (data first) ----
  const insights = generateInsights(data, today).slice(0, 2)
  const insightTexts = insights.map((i) => i.text)
  surfacedInsightIds.push(...insights.map((i) => i.ruleId))

  // ---- Recovery ----
  const poolKey = recoveryPoolKey(session.templateId, resolved.kind)
  const recovery: string[] = [...insightTexts]
  recovery.push(take(`recovery-${poolKey}`, RECOVERY_POOLS[poolKey] ?? RECOVERY_POOLS.generic))

  // ---- Eat now ----
  const dayType = nutritionDayType(session.date, data)
  const proteinSoFar = proteinFor(data, session.date)
  const proteinLeft = Math.max(0, data.settings.proteinTargetG - proteinSoFar)
  const kcalTarget = kcalTargetFor(dayType, data.settings.trainingDayKcalBonus)
  const kcalLeft = Math.max(0, kcalTarget - kcalFor(data, session.date))
  const eat = [
    take(`eat-${dayType}`, EAT_NOW[dayType], {
      proteinSoFar,
      proteinLeft,
      kcalLeft,
      kcalTarget,
      proteinTarget: data.settings.proteinTargetG,
    }),
  ]

  // ---- Sleep (with tomorrow-awareness) ----
  const tomorrow = resolveDay(addDaysISO(session.date, 1), data)
  const sleep = [take('sleep', SLEEP_TIPS)]
  if (tomorrow.cns) {
    sleep.push(
      `Tomorrow is ${tomorrow.title} — a CNS day. Short sleep tonight = readiness flags tomorrow. Protect the night.`,
    )
  } else if (tomorrow.kind === 'session') {
    sleep.push(`Tomorrow: ${tomorrow.title}. Sleep is the first exercise of that session.`)
  }

  // ---- Tomorrow preview ----
  const tomorrowLine =
    tomorrow.kind === 'rest'
      ? 'Tomorrow: full rest. Eat to rest-day numbers, walk if you like, lift nothing.'
      : tomorrow.kind === 'mobility'
        ? 'Tomorrow: mobility + active recovery, 20-30 easy minutes. Recovery with a checklist.'
        : `Tomorrow: ${tomorrow.title}${tomorrow.isDeload ? ' (deload volume)' : ''}. ${tomorrow.tagline}`

  return {
    debrief: {
      date: session.date,
      title: `${formatDayLabel(session.date)} — ${resolved.title}`,
      recap,
      recovery,
      eat,
      sleep,
      tomorrow: tomorrowLine,
    },
    shownIds,
    surfacedInsightIds,
    prNames: prs.map((p) => p.name),
  }
}
