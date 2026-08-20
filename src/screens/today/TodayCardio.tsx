import type { AppData, ISODate, ResolvedDay } from '../../types'
import { Card, Chip } from '../../components/ui'
import { getExercise } from '../../plan/exercises'
import { CARDIO_GROUP_INFO } from '../../plan/templates'
import { cardioActivity } from '../../plan/cardio'
import { addDaysISO, mondayOf } from '../../engine/calendar'
import { lifeEventsOn, resolveDay } from '../../engine/resolveDay'
import { dayActivities, shortDuration } from '../../engine/activityStats'
import { intensityLabel } from '../../engine/intensity'
import { chooseCardio, toggleCnsSwap } from '../../logic/actions'

// ============================================================
// Everything cardio on the Today screen: the chip that logs it,
// the day-aware line about WHEN to put it, what has already
// been logged, and, on a required-cardio day, the chooser that
// IS the day until an option is picked.
//
// Extracted from TodayScreen whole. Same conditions, same copy,
// same order.
// ============================================================

/**
 * Day-aware cardio coaching: the chip stays every day, the line under
 * it says whether cardio is smart today and WHEN to put it.
 */
function cardioTip(day: ResolvedDay, date: ISODate, data: AppData): string | null {
  if (day.kind === 'cardio-backup') return null // the day IS the cardio
  const tomorrowCns = resolveDay(addDaysISO(date, 1), data).cns
  if (day.cns) return "Cardio only AFTER today's session. Speed work needs fresh legs."
  if (tomorrowCns) return 'Keep cardio easy (zone 2). Tomorrow is a max-effort day.'
  if (day.kind === 'rest') return 'Rest from lifting. Easy cardio still counts.'
  if (day.kind === 'mobility') return 'Good day for conditioning. Pair it with the mobility work.'
  return 'Cardio welcome. After the lifts beats before.'
}

export function TodayCardio({
  data,
  date,
  day,
  today,
  realToday,
  finished,
  hasSession,
  onOpenCardio,
}: {
  data: AppData
  date: ISODate
  day: ResolvedDay
  /** Viewing the live day, as opposed to browsing with the arrows. */
  today: boolean
  realToday: ISODate
  finished: boolean
  hasSession: boolean
  onOpenCardio: () => void
}) {
  if (!(date <= realToday && !finished)) return null

  const cardioEntries = data.cardio[date] ?? []
  const yesterday = addDaysISO(date, -1)
  const ballYesterday = data.weeks[mondayOf(yesterday)]?.ballDates.includes(yesterday) ?? false
  const cnsSwapped = data.weeks[mondayOf(date)]?.cnsSwapDates.includes(date) ?? false
  const canSwapCns = day.cns && (ballYesterday || lifeEventsOn(data, date, 'late-night').length > 0)
  const tip = cardioTip(day, date, data)

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <Chip tone={cardioEntries.length > 0 ? 'lime' : 'default'} onClick={onOpenCardio}>
          {cardioEntries.length > 0
            ? `${cardioActivity(cardioEntries[0].activityId).emoji} Cardio logged ✓ (${cardioEntries.length})`
            : 'Cardio today?'}
        </Chip>
        {canSwapCns && !hasSession && (
          <Chip tone={cnsSwapped ? 'gold' : 'cyan'} onClick={() => toggleCnsSwap(date)}>
            {cnsSwapped ? '↩ undo speed-work swap' : '⇄ swap speed work out (sanctioned)'}
          </Chip>
        )}
      </div>
      {today && cardioEntries.length === 0 && tip && (
        <p className="px-1 text-[11px] leading-snug text-ink-faint">{tip}</p>
      )}
      {/* Once something is logged the tip is gone and this took its
          place. The chip counts entries; it never said what they
          were, so an hour of tracked ball read the same as a walk. */}
      {dayActivities(data, date).map((a, i) => (
        <p key={i} className="px-1 text-[11px] leading-snug text-ink-faint">
          <span className="font-bold text-ink-dim">
            {a.emoji} {a.label}
          </span>
          {[
            shortDuration(a.minutes),
            a.steps ? `${a.steps.toLocaleString()} steps` : null,
            a.miles ? `${a.miles} mi` : null,
            a.kcal ? `~${a.kcal} cal` : null,
            a.tier ? intensityLabel(a.tier).toLowerCase() : null,
          ]
            .filter(Boolean)
            .map((bit) => ` · ${bit}`)}
        </p>
      ))}
    </>
  )
}

/** Required cardio: the chooser IS the day until an option is picked. */
export function CardioBackupChooser({ data, date }: { data: AppData; date: ISODate }) {
  return (
    <div className="space-y-3">
      {(['A', 'B', 'circuit'] as const).map((g) => (
        <Card key={g} className="space-y-2">
          <div>
            <div className="text-[12px] font-black uppercase tracking-wider text-accent">
              {CARDIO_GROUP_INFO[g].title}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug text-ink-faint">{CARDIO_GROUP_INFO[g].when}</div>
          </div>
          {data.plan.cardioOptions.filter((c) => c.group === g).map((c) => {
            const def = getExercise(c.exerciseId)
            return (
              <button
                key={c.exerciseId}
                onClick={() => chooseCardio(date, c.exerciseId)}
                className="flex w-full items-center justify-between rounded-xl bg-white/[0.07] px-3.5 py-3 text-left active:bg-white/[0.09]"
              >
                <span className="text-[13.5px] font-bold">{def.name}</span>
                <span className="font-mono text-[11.5px] text-ink-dim">{c.repText}</span>
              </button>
            )
          })}
        </Card>
      ))}
      <p className="px-1 text-[11.5px] leading-snug text-ink-faint">
        Pick one and it becomes today's session. Already logged a run? Tap the cardio chip above and
        this clears itself.
      </p>
    </div>
  )
}
