import { useState } from 'react'
import type { CardioEntry, CardioWhen, ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { CARDIO_ACTIVITIES, cardioActivity } from '../../plan/cardio'
import { logCardio, removeCardio } from '../../logic/actions'
import { Btn, Chip, Stepper } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { RunTrackerSheet } from './RunTrackerSheet'

// ============================================================
// Daily cardio: pick what YOU did, run, ride, swim, a game,
// and answer only that activity's questions (indoor/outdoor,
// miles, minutes, running games vs shooting around), plus
// whether it was pre- or post-workout.
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
  const [tracking, setTracking] = useState<'run' | 'bike' | null>(null)
  const [when, setWhen] = useState<CardioWhen>(hasSession ? 'post' : 'solo')
  const [where, setWhere] = useState<'indoor' | 'outdoor'>('outdoor')
  const [miles, setMiles] = useState(2)
  const [minutes, setMinutes] = useState(30)
  const [mode, setMode] = useState<string | null>(null)
  const [customLabel, setCustomLabel] = useState('')

  const def = picked ? cardioActivity(picked) : null

  const reset = () => {
    setPicked(null)
    setMode(null)
    setCustomLabel('')
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
    reset()
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose() }} title="Cardio / sport">
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

        {/* Step 1: what was it? */}
        {!picked && (
          <>
            <p className="text-[12px] font-black uppercase tracking-wider text-ink-faint">
              {entries.length ? 'Log another' : 'What did you do?'}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {CARDIO_ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setPicked(a.id); setMode(a.modes?.[0]?.id ?? null) }}
                  className="rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05] px-2 py-3 text-center active:border-accent/50"
                >
                  <div className="text-[20px]">{a.emoji}</div>
                  <div className="mt-0.5 text-[11px] font-bold leading-tight">{a.label}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-snug text-ink-faint">
              Games and hard runs count as this week's conditioning automatically. The plan protects
              the next day's speed work.
            </p>
          </>
        )}

        {/* Step 2: only that activity's questions */}
        {def && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[22px]">{def.emoji}</span>
              <span className="text-[16px] font-black">{def.label}</span>
              <button onClick={reset} className="ml-auto rounded-full bg-white/[0.07] px-3 py-1 text-[11px] font-bold text-ink-dim">
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
    </Sheet>
  )
}

function modeLabel(activityId: string, mode: string): string {
  return cardioActivity(activityId).modes?.find((m) => m.id === mode)?.label ?? mode
}

function describeEntry(e: CardioEntry): string {
  const bits: string[] = []
  if (e.where) bits.push(e.where)
  if (e.miles) bits.push(`${e.miles} mi`)
  if (e.minutes) bits.push(`${e.minutes} min`)
  bits.push(e.when === 'pre' ? 'pre-workout' : e.when === 'post' ? 'post-workout' : 'standalone')
  return bits.join(' · ')
}
