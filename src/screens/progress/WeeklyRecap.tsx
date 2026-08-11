import { useMemo, useState } from 'react'
import type { AppData } from '../../types'
import { addDaysISO, formatShort } from '../../engine/calendar'
import { adherenceMap, currentStreak, e1RM, proteinFor } from '../../engine/stats'
import { getExercise } from '../../plan/exercises'

// ============================================================
// The weekly recap — Wrapped-style story cards after a check-in.
// One big number per card, tap to advance. Celebration where
// it's earned, honesty where it isn't; never a wall of stats.
// ============================================================

interface RecapCard {
  eyebrow: string
  big: string
  caption: string
  glow: string // tailwind color token for the bloom
}

function buildCards(data: AppData, today: string): RecapCard[] {
  const cards: RecapCard[] = []
  const heat = adherenceMap(data, 7)
  const scheduled = heat.filter((d) => d.state !== 'rest' && d.state !== 'future').length
  const done = heat.filter((d) => d.state === 'done').length
  const partial = heat.filter((d) => d.state === 'partial').length

  cards.push({
    eyebrow: 'This week',
    big: `${done + partial}/${Math.max(scheduled, done + partial)}`,
    caption:
      done + partial >= scheduled && scheduled > 0
        ? 'Every scheduled session, banked. That is how bodies get built.'
        : scheduled === 0
          ? 'A quiet week on the schedule.'
          : `${done + partial} of ${scheduled} sessions. Every one you made counts. Every one you missed knows.`,
    glow: 'var(--color-accent)',
  })

  const streak = currentStreak(data)
  if (streak >= 2) {
    cards.push({
      eyebrow: 'Streak',
      big: String(streak),
      caption: streak >= 14 ? 'Days in a row. This is who you are now.' : 'Days in a row. Protect it like a PR.',
      glow: 'var(--color-lime)',
    })
  }

  let pDays = 0
  let pHit = 0
  for (let i = 0; i < 7; i++) {
    const g = proteinFor(data, addDaysISO(today, -i))
    if (g > 0) {
      pDays++
      if (g >= data.settings.proteinTargetG) pHit++
    }
  }
  if (pDays > 0) {
    cards.push({
      eyebrow: 'Protein',
      big: `${pHit}/${pDays}`,
      caption:
        pHit === pDays
          ? 'Target hit every logged day. The muscle you keep is built at the table.'
          : `Days on target. The other ${pDays - pHit}? That's where gains leak.`,
      glow: 'var(--color-cyan)',
    })
  }

  // Body movement vs the previous check-in
  const ms = data.measurements
  if (ms.length >= 2) {
    const last = ms[ms.length - 1]
    const prev = ms[ms.length - 2]
    if (last.weightLb !== undefined && prev.weightLb !== undefined) {
      const d = Math.round((last.weightLb - prev.weightLb) * 10) / 10
      const bf =
        last.bodyFatPct !== undefined && prev.bodyFatPct !== undefined
          ? Math.round((last.bodyFatPct - prev.bodyFatPct) * 10) / 10
          : null
      cards.push({
        eyebrow: 'The body',
        big: `${d > 0 ? '+' : ''}${d} lb`,
        caption:
          bf !== null
            ? `Body fat ${bf > 0 ? '+' : ''}${bf}% since last check-in. Trends, not days.`
            : 'Since last check-in. One data point. The trend line is the truth.',
        glow: 'var(--color-gold)',
      })
    }
  }

  // Heaviest estimated set of the week
  let bestE = 0
  let bestLabel = ''
  for (let i = 0; i < 7; i++) {
    const s = data.sessions[addDaysISO(today, -i)]
    if (!s) continue
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (set.done && set.weightLb && set.reps) {
          const e = e1RM(set.weightLb, set.reps)
          if (e > bestE) {
            bestE = e
            bestLabel = getExercise(ex.exerciseId).name
          }
        }
      }
    }
  }
  if (bestE > 0) {
    cards.push({
      eyebrow: 'Heaviest work',
      big: `${Math.round(bestE)} lb`,
      caption: `Estimated 1RM on ${bestLabel}. Strength is the engine under everything else.`,
      glow: 'var(--color-accent)',
    })
  }

  const closeLine =
    scheduled > 0 && done + partial >= scheduled
      ? 'Same inputs next week. Momentum compounds.'
      : 'Next week wants one thing: show up one more time than this week.'
  cards.push({ eyebrow: 'Next week', big: '→', caption: closeLine, glow: 'var(--color-lime)' })
  return cards
}

export function WeeklyRecap({ data, today, onClose }: { data: AppData; today: string; onClose: () => void }) {
  const cards = useMemo(() => buildCards(data, today), [data, today])
  const [i, setI] = useState(0)
  const card = cards[i]
  const last = i === cards.length - 1

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-bg"
      onClick={(e) => {
        const x = (e as React.MouseEvent).clientX
        if (x < window.innerWidth * 0.3) setI((n) => Math.max(0, n - 1))
        else if (!last) setI((n) => n + 1)
      }}
    >
      {/* story progress */}
      <div className="flex gap-1 px-4 pt-[max(env(safe-area-inset-top),14px)]">
        {cards.map((_, n) => (
          <div key={n} className={`h-1 flex-1 rounded-full ${n <= i ? 'bg-ink' : 'bg-edge'}`} />
        ))}
      </div>
      <div className="text-right">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="px-4 py-2 text-[13px] font-bold text-ink-faint"
        >
          ✕
        </button>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div
          className="pointer-events-none absolute h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: card.glow }}
        />
        <div className="text-[12px] font-black uppercase tracking-[0.3em] text-ink-dim">{card.eyebrow}</div>
        <div
          className="mt-4 font-display text-[88px] font-bold leading-none tracking-tight"
          style={{ color: card.glow }}
        >
          {card.big}
        </div>
        <p className="mx-auto mt-6 max-w-[30ch] font-display text-[19px] font-bold leading-snug text-ink">
          {card.caption}
        </p>
        <div className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Week ending {formatShort(today)}
        </div>
      </div>

      <div className="px-6 pb-[max(env(safe-area-inset-bottom),20px)]">
        {last ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="w-full rounded-xl bg-lime py-4 text-[15px] font-extrabold text-black"
          >
            Back to work
          </button>
        ) : (
          <p className="text-center text-[11px] text-ink-faint">tap to continue</p>
        )}
      </div>
    </div>
  )
}
