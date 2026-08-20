import { useState } from 'react'
import { useAppStore } from '../../store/appStore'

// ============================================================
// How loud the session is, chosen mid-session.
//
// Lifted out of FocusView whole: same button, same popover, same
// four choices. It left because the logger was sitting one line
// under its cap with nothing to spend, and a self-contained
// popover with its own open state is the obvious thing to move.
// FocusView's allowance drops by what this took with it.
//
// This one switch now governs the whole sound palette, not just
// the countdown it was written for. See logic/sfx.ts.
// ============================================================

export type SoundMode = 'voice' | 'beeps-names' | 'beeps' | 'silent'

const MODES = [
  ['voice', 3, 'Voice coach', 'Set intros + countdown'],
  ['beeps-names', 2, 'Beeps + names', 'Countdown beeps, next exercise name only'],
  ['beeps', 1, 'Beeps only', 'Countdown beeps'],
  ['silent', 0, 'Silent', 'Screen only, no sound'],
] as const

const WAVES: Record<SoundMode, 0 | 1 | 2 | 3> = {
  voice: 3,
  'beeps-names': 2,
  beeps: 1,
  silent: 0,
}

export function SoundModePicker({ mode }: { mode: SoundMode }) {
  const update = useAppStore((s) => s.update)
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`rounded-full px-3 py-1.5 ${mode !== 'silent' ? 'bg-accent/20 text-accent-soft' : 'bg-surface-2 text-ink-faint'}`}
        aria-label="Session sound"
      >
        <VolumeIcon waves={WAVES[mode]} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-56 overflow-hidden rounded-2xl border-2 border-edge bg-surface shadow-[0_4px_0_var(--color-edge)]">
          {MODES.map(([id, waves, label, sub], i) => (
            <button
              key={id}
              onClick={() => {
                update((d) => {
                  d.settings.soundMode = id
                })
                setOpen(false)
              }}
              className={`flex w-full items-center gap-3 border-edge-soft px-3.5 py-2.5 text-left ${i > 0 ? 'border-t-2' : ''} ${mode === id ? 'bg-accent/10' : ''}`}
            >
              <VolumeIcon waves={waves} />
              <span className="min-w-0">
                <span className={`block text-[12.5px] font-bold ${mode === id ? 'text-accent-soft' : 'text-ink'}`}>
                  {label}
                </span>
                <span className="block text-[10px] leading-snug text-ink-faint">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VolumeIcon({ waves }: { waves: 0 | 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="currentColor" stroke="none" />
      {waves >= 1 && <path d="M14.5 10a3.2 3.2 0 0 1 0 4" />}
      {waves >= 2 && <path d="M16.8 8a6.4 6.4 0 0 1 0 8" />}
      {waves >= 3 && <path d="M19.1 6a9.6 9.6 0 0 1 0 12" />}
      {waves === 0 && <path d="M14.5 9.5 20 15M20 9.5 14.5 15" />}
    </svg>
  )
}
