import { useState } from 'react'
import type { ISODate, LifeEventKind, Weekday } from '../../types'
import { uid, useAppStore } from '../../store/appStore'
import { addDaysISO, mondayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { Card, Chip, Tile, Toggle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'

// ============================================================
// The things in your week that are not training.
//
// A gig, a night shift, a long day on your feet, a bad night's
// sleep. The plan bends around all of them, and this is where
// you tell it.
//
// It used to be the bottom half of the week screen: an editor
// with seven day-buttons per event, sitting under a calendar
// that already shows what it produced. A calendar shows the
// week; a form changes it. The week keeps the markers on its
// day rows and the form moved in here, one tap away.
// ============================================================

const WD_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function LifeEventsSheet({
  weekStart,
  open,
  onClose,
}: {
  weekStart: ISODate
  open: boolean
  onClose: () => void
}) {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const updateWeek = useAppStore((s) => s.updateWeek)
  const today = useToday()
  const week = data.weeks[weekStart]
  const ball = data.plan.sportMode === 'ball'

  return (
    <Sheet open={open} onClose={onClose} title="Life this week">
      <div className="space-y-2 pb-6">
        {data.plan.lifeEvents.length === 0 && (
          <Tile>
            <p className="text-[12.5px] leading-relaxed text-ink-dim">
              {ball
                ? 'A gig, a night shift, a long day on your feet. Add it and the plan bends around it.'
                : 'Late nights, long shifts, whatever drains you. Add it and the plan bends around it.'}
            </p>
          </Tile>
        )}
        {data.plan.lifeEvents.map((ev) => {
          const days = week?.events[ev.id] ?? []
          return (
            <Tile key={ev.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-black">
                    {ev.kind === 'late-night' ? '🌙' : '🦵'} {ev.label}
                  </div>
                  <div className="mt-px text-[10.5px] font-bold text-ink-faint">
                    {ev.kind === 'late-night'
                      ? 'Train that morning · next day starts short on sleep'
                      : 'Next day drops a jump set, legs arrive pre-fatigued'}
                  </div>
                </div>
                <button
                  aria-label={`Remove ${ev.label}`}
                  onClick={() =>
                    update((d) => {
                      d.plan.lifeEvents = d.plan.lifeEvents.filter((x) => x.id !== ev.id)
                    })
                  }
                  className="press shrink-0 rounded-lg border-2 border-edge bg-surface-2 px-2.5 py-1 text-[11px] font-black text-ink-faint"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-1">
                <span className="eyebrow text-ink-faint">Which days?</span>
                <div className="flex gap-1">
                  {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        updateWeek(weekStart, (w) => {
                          const cur = w.events[ev.id] ?? []
                          w.events[ev.id] = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
                        })
                      }
                      className={`press-down h-8 w-9 rounded-lg border-2 text-[11px] font-black ${
                        days.includes(d)
                          ? 'border-accent-deep bg-accent text-black [--lip:var(--lip-accent)]'
                          : 'border-edge bg-surface-2 text-ink-faint [--lip:var(--lip-quiet)]'
                      }`}
                    >
                      {WD_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>
              {data.plan.lifeRules.djWeekend && ev.id === 'dj' && days.includes(5) && (
                <div className="mt-2">
                  <Toggle
                    on={!!week?.friPushedToSat}
                    onChange={(v) => updateWeek(weekStart, (w) => { w.friPushedToSat = v })}
                    label="→ Push Friday's pull to Saturday"
                    sub="Saturday becomes speed + lighter combined pull."
                  />
                </div>
              )}
            </Tile>
          )
        })}
        <AddLifeEvent onAdd={(label, kind) => update((d) => { d.plan.lifeEvents.push({ id: uid(), label, kind }) })} />
        <Toggle
          on={(week?.badSleepDates ?? []).includes(addDaysISO(today, -1))}
          onChange={(v) =>
            updateWeek(mondayOf(addDaysISO(today, -1)), (w) => {
              const y = addDaysISO(today, -1)
              w.badSleepDates = v ? [...new Set([...w.badSleepDates, y])] : w.badSleepDates.filter((d) => d !== y)
            })
          }
          label="Bad sleep last night (under 6 h)"
          sub="Two in a row cuts the next day's volume by a third automatically."
        />
      </div>
    </Sheet>
  )
}

/** Inline creator for a custom life event (label + effect kind). */
function AddLifeEvent({ onAdd }: { onAdd: (label: string, kind: LifeEventKind) => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<LifeEventKind>('late-night')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press-down w-full rounded-[14px] border-2 border-edge bg-surface-2 py-3 text-[12.5px] font-black text-ink-faint [--lip:var(--lip-quiet)]"
      >
        + Add a life event (gig, shift, whatever's real)
      </button>
    )
  }
  return (
    <Card className="space-y-3 !py-3.5">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder='Name it: "DJ set", "night shift", "closing shift"'
        className="w-full rounded-xl border-2 border-edge bg-surface-2 px-3.5 py-2.5 text-[14px] font-semibold outline-none focus:border-accent-deep"
      />
      <div className="flex gap-1.5">
        {(
          [
            ['late-night', '🌙 Late night'],
            ['on-feet', '🦵 On my feet all day'],
          ] as const
        ).map(([id, l]) => (
          <Chip key={id} tone={kind === id ? 'accent' : 'default'} pressed={kind === id} onClick={() => setKind(id)}>
            {l}
          </Chip>
        ))}
      </div>
      <p className="text-[10.5px] leading-snug text-ink-faint">
        {kind === 'late-night'
          ? 'Late night → train that morning; the next day gets a short-sleep heads-up.'
          : 'All day standing → the NEXT day drops a jump set (legs arrive pre-fatigued).'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="press-down flex-1 rounded-xl border-2 border-edge bg-surface-2 py-2.5 text-[12.5px] font-black text-ink-dim [--lip:var(--lip-quiet)]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!label.trim()) return
            onAdd(label.trim(), kind)
            setLabel('')
            setOpen(false)
          }}
          className="press-down flex-1 rounded-xl border-2 border-accent-deep bg-accent py-2.5 text-[12.5px] font-black text-black disabled:opacity-40 [--lip:var(--lip-accent)]"
          disabled={!label.trim()}
        >
          Add it
        </button>
      </div>
    </Card>
  )
}
