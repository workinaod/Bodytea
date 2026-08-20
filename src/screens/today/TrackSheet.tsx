import { useState } from 'react'
import type { GpsActivity } from '../../activityTypes'
import { CARDIO_ACTIVITIES } from '../../plan/cardio'
import { Sheet } from '../../components/Sheet'

// ============================================================
// Pick something to track.
//
// The old version was twenty near-identical grey pills at one
// weight, so nothing led and the eye had nowhere to land. Two
// things separate them now: the GPS four get their own band with
// the accent on them, because those are the ones that open a live
// map, and the rest become a tile grid rather than long rows, so
// fifteen sports read as a set instead of a list to be waded
// through.
//
// Custom is not one more tile. It is the whole bottom row and it
// is the input itself: tap it and type, rather than tapping a
// button that opens a box that asks you to type.
// ============================================================

const GPS: { id: GpsActivity; label: string; emoji: string }[] = [
  { id: 'run', label: 'Run', emoji: '🏃' },
  { id: 'bike', label: 'Ride', emoji: '🚴' },
  { id: 'walk', label: 'Walk', emoji: '🚶' },
  { id: 'hike', label: 'Hike', emoji: '🥾' },
]

/**
 * Same look as the shared SectionTitle, without its mt-9. That
 * margin is right on a screen and far too much inside a sheet.
 */
function Band({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <div className={`flex items-baseline gap-3 px-1 ${first ? '' : 'mt-5'}`}>
      <h2 className="eyebrow whitespace-nowrap text-ink-faint">{children}</h2>
      <span aria-hidden className="h-px min-w-4 flex-1 self-center bg-edge/70" />
    </div>
  )
}

export function TrackSheet({
  open,
  onClose,
  onPickGps,
  onPickTimed,
}: {
  open: boolean
  onClose: () => void
  onPickGps: (id: GpsActivity) => void
  /** `label` is only set for the custom row, where the user named it. */
  onPickTimed: (id: string, label?: string) => void
}) {
  const [custom, setCustom] = useState('')
  const timed = CARDIO_ACTIVITIES.filter((a) => !a.gps && a.id !== 'custom')

  function startCustom() {
    const name = custom.trim()
    if (!name) return
    setCustom('')
    onPickTimed('custom', name)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Track">
      <div className="pb-8">
        <Band first>Live GPS</Band>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {GPS.map((a) => (
            <button
              key={a.id}
              onClick={() => onPickGps(a.id)}
              className="press flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface py-4 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset] border-2 border-accent-deep"
            >
              <span className="text-[22px] leading-none">{a.emoji}</span>
              <span className="text-[11.5px] font-extrabold text-accent-soft">{a.label}</span>
            </button>
          ))}
        </div>

        <Band>Timed</Band>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {timed.map((a) => (
            <button
              key={a.id}
              onClick={() => onPickTimed(a.id)}
              className="press flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl bg-surface px-1.5 py-3 border-2 border-edge active:bg-surface-2"
            >
              <span className="text-[19px] leading-none">{a.emoji}</span>
              <span className="text-center text-[10.5px] font-bold leading-tight text-ink-dim">
                {a.label}
              </span>
            </button>
          ))}
        </div>

        {/* The whole bottom row, and the field itself. */}
        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5 border-2 border-edge focus-within:ring-accent/40">
          <span className="text-[18px] leading-none">✨</span>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') startCustom()
            }}
            placeholder="Custom"
            enterKeyHint="go"
            maxLength={40}
            className="min-w-0 flex-1 bg-transparent py-1 text-[13px] font-bold text-ink outline-none placeholder:font-bold placeholder:text-ink-dim"
          />
          {custom.trim() && (
            <button
              onClick={startCustom}
              className="press shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-black text-black"
            >
              Start
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-snug text-ink-faint">
          Timed session, logged as today's cardio when you finish.
        </p>
      </div>
    </Sheet>
  )
}
