import { useState } from 'react'
import type { CardioEntry, CardioWhen, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { CARDIO_ACTIVITIES, cardioActivity } from '../../plan/cardio'
import { logCardio, removeCardio } from '../../logic/actions'
import { Btn, Chip, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { RunTrackerSheet } from './RunTrackerSheet'
import { CardioTimerSheet } from './CardioTimerSheet'

// ============================================================
// Daily cardio, in two directions.
//
// LOG IT: it already happened. Pick what you did and answer only
// that activity's questions (indoor/outdoor, miles, minutes,
// running games vs shooting around), plus pre- or post-workout.
//
// TRACK IT: it is about to happen. Picking the activity opens the
// recorder for it right there, GPS for a run or a ride and a timer
// for everything else, and it logs itself when you finish. No dead
// ends: every activity leads somewhere from either direction.
// ============================================================

const NO_ENTRIES: CardioEntry[] = []

export function CardioSheet({
  date,
  hasSession,
  open,
  onClose,
}: {
  date: ISODate
  hasSession: boolean
  open: boolean
  onClose: () => void
}) {
  const entries = useAppStore((s) => s.data.cardio[date]) ?? NO_ENTRIES
  const [picked, setPicked] = useState<string | null>(null)
  const [intent, setIntent] = useState<'log' | 'track' | null>(null)
  const [tracking, setTracking] = useState<'run' | 'bike' | null>(null)
  const [timing, setTiming] = useState<string | null>(null)
  const [when, setWhen] = useState<CardioWhen>(hasSession ? 'post' : 'solo')
  const [where, setWhere] = useState<'indoor' | 'outdoor'>('outdoor')
  const [miles, setMiles] = useState(2)
  const [minutes, setMinutes] = useState(30)
  const [mode, setMode] = useState<string | null>(null)
  const [customLabel, setCustomLabel] = useState('')

  const def = picked ? cardioActivity(picked) : null

  /** Clear the form but stay in this direction, so logging two things in a row is two taps. */
  const resetForm = () => {
    setPicked(null)
    setMode(null)
    setCustomLabel('')
  }

  /** All the way back to the start, for closing the sheet. */
  const reset = () => {
    resetForm()
    setIntent(null)
  }

  /** Picking an activity means different things depending on the direction. */
  const choose = (id: string) => {
    if (intent === 'track') {
      if (id === 'run' || id === 'bike') setTracking(id)
      else setTiming(id)
      return
    }
    setPicked(id)
    setMode(cardioActivity(id).modes?.[0]?.id ?? null)
  }

  const save = () => {
    if (!def) return
    const entry: Omit<CardioEntry, 'id' | 'at'> = {
      activityId: def.id,
      label: def.id === 'custom' ? customLabel.trim() || 'Cardio' : def.label,
      when: hasSession ? when : 'solo',
      ...(def.asks.where ? { where } : {}),
      ...(def.asks.miles ? { miles } : {}),
      ...(def.asks.minutes ? { minutes } : {}),
      ...(def.modes && mode ? { mode } : {}),
    }
    logCardio(date, entry)
    resetForm()
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose() }} title="Cardio">
      <div className="space-y-4 pb-8">
        {/* Already logged today */}
        {entries.length > 0 && !picked && (
          <div className="space-y-1.5">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3 py-2.5">
                <span className="text-[16px]">{cardioActivity(e.activityId).emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{e.label}{e.mode ? ` · ${modeLabel(e.activityId, e.mode)}` : ''}</div>
                  <div className="text-[11px] text-ink-faint">{describeEntry(e)}</div>
                </div>
                <button
                  onClick={() => removeCardio(date, e.id)}
                  className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-danger"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Step 1: already done, or about to happen? */}
        {!picked && !intent && (
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { id: 'log', emoji: '✍️', label: 'Log it', sub: 'Already done' },
                { id: 'track', emoji: '⏱', label: 'Track it', sub: 'Start now' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                onClick={() => setIntent(c.id)}
                className="press flex flex-col items-center justify-center gap-1 rounded-3xl bg-gradient-to-b from-white/[0.13] to-white/[0.05] py-6 shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_10px_24px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.09]"
              >
                <span className="text-[24px] leading-none">{c.emoji}</span>
                <span className="text-heading font-extrabold">{c.label}</span>
                <span className="text-micro font-bold tracking-normal text-ink-faint">{c.sub}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: which activity? Same grid either way. */}
        {!picked && intent && (
          <>
            <div className="flex items-center gap-2">
              <p className="eyebrow text-ink-faint">
                {intent === 'track' ? 'Track what?' : entries.length ? 'Log another' : 'What did you do?'}
              </p>
              <button
                onClick={() => setIntent(null)}
                className="press ml-auto rounded-full bg-white/[0.07] px-3 py-1 text-micro font-bold tracking-normal text-ink-dim"
              >
                back
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {CARDIO_ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => choose(a.id)}
                  className="press rounded-xl bg-white/[0.05] px-2 py-3 text-center ring-1 ring-white/[0.05]"
                >
                  <div className="text-[20px]">{a.emoji}</div>
                  <div className="mt-0.5 text-[11px] font-bold leading-tight">{a.label}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-ink-faint">
              {intent === 'track'
                ? 'Run and ride record GPS, pace and splits. Everything else runs a timer. Either way it logs itself when you finish.'
                : "Games and hard runs count as this week's conditioning automatically. The plan protects the next day's speed work."}
            </p>
          </>
        )}

        {/* Step 2: only that activity's questions */}
        {def && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[22px]">{def.emoji}</span>
              <span className="text-[16px] font-black">{def.label}</span>
              <button onClick={resetForm} className="ml-auto rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-bold text-ink-dim">
                change
              </button>
            </div>

            {(def.id === 'run' || def.id === 'bike') && (
              <button
                onClick={() => setTracking(def.id as 'run' | 'bike')}
                className="flex w-full items-center justify-between rounded-2xl border border-accent/35 bg-accent/8 px-4 py-3 text-left active:bg-accent/15"
              >
                <span>
                  <span className="block text-[13.5px] font-extrabold text-accent-soft">
                    Track it live with GPS
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
                    Map, time, distance, {def.id === 'bike' ? 'speed' : 'pace'} + mile splits. Logs itself
                    when you finish.
                  </span>
                </span>
                <span className="text-[18px]">🛰</span>
              </button>
            )}

            {def.id === 'custom' && (
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="What was it? (spin class, boxing, …)"
                className="w-full rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-3.5 py-2.5 text-[14px] font-semibold outline-none focus:ring-accent/45"
              />
            )}

            {def.modes && (
              <div>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">How'd it go down?</p>
                <div className="flex flex-wrap gap-1.5">
                  {def.modes.map((m) => (
                    <Chip key={m.id} tone={mode === m.id ? 'accent' : 'default'} onClick={() => setMode(m.id)}>
                      {m.label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {def.asks.where && (
              <div>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Indoor or outdoor?</p>
                <div className="flex gap-1.5">
                  {(['outdoor', 'indoor'] as const).map((w) => (
                    <Chip key={w} tone={where === w ? 'accent' : 'default'} onClick={() => setWhere(w)}>
                      {w === 'outdoor' ? '🌤 Outdoor' : '🏠 Indoor'}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {def.asks.miles && (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold">Miles</span>
                  <Stepper value={miles} onChange={(v) => setMiles(Math.max(0, v))} step={0.5} width="w-14" />
                </div>
              )}
              {def.asks.minutes && (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold">Minutes</span>
                  <Stepper value={minutes} onChange={(v) => setMinutes(Math.max(0, v))} step={5} width="w-14" />
                </div>
              )}
            </div>

            {hasSession && (
              <div>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-ink-faint">Around the workout?</p>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['pre', 'Pre-workout'],
                      ['post', 'Post-workout'],
                      ['solo', 'On its own'],
                    ] as const
                  ).map(([id, label]) => (
                    <Chip key={id} tone={when === id ? 'accent' : 'default'} onClick={() => setWhen(id)}>
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <Btn className="w-full py-3.5" onClick={save}>
              Log it
            </Btn>
          </div>
        )}
      </div>
      {tracking && (
        <RunTrackerSheet
          activity={tracking}
          date={date}
          onClose={() => {
            setTracking(null)
            reset()
          }}
        />
      )}
      {timing && (
        <CardioTimerSheet
          activityId={timing}
          date={date}
          onClose={() => {
            setTiming(null)
            reset()
          }}
        />
      )}
    </Sheet>
  )
}

function modeLabel(activityId: string, mode: string): string {
  return cardioActivity(activityId).modes?.find((m) => m.id === mode)?.label ?? mode
}

function describeEntry(e: CardioEntry): string {
  const bits: string[] = []
  if (e.where) bits.push(e.where)
  // Steps sit beside the distance they produced, and the existing
  // miles-then-minutes order is left alone: an entry logged by hand
  // reads exactly as it always did.
  if (e.steps) bits.push(`${e.steps.toLocaleString()} steps`)
  if (e.miles) bits.push(`${e.miles} mi`)
  if (e.minutes) bits.push(`${e.minutes} min`)
  if (e.kcalEst) bits.push(`~${e.kcalEst} cal`)
  bits.push(e.when === 'pre' ? 'pre-workout' : e.when === 'post' ? 'post-workout' : 'standalone')
  return bits.join(' · ')
}
