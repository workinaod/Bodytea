import { useEffect, useState } from 'react'
import type { RoutineNote } from '../../plan/analyze'
import { enableReminders } from '../../logic/reminders'

// ============================================================
// The pieces the review steps are built from: how a routine
// note is coloured, and the permission prompts that ask in
// context rather than on launch.
// ============================================================

export const NOTE_TONE: Record<RoutineNote['tone'], string> = {
  warn: 'border-danger/40 bg-danger/10 text-danger',
  good: 'border-lime/40 bg-lime/10 text-lime',
  info: 'border-cyan/30 bg-cyan/10 text-cyan',
}
export const NOTE_LABEL: Record<RoutineNote['tone'], string> = { warn: 'Fix this', good: 'Solid', info: 'Heads up' }

/** Ask for what the app needs, in context, before the plan starts. */
export function PermissionsBlock() {
  const [notif, setNotif] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [geo, setGeo] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt')

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeo('unsupported')
      return
    }
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((st) => setGeo(st.state as 'granted' | 'denied' | 'prompt'))
      .catch(() => {})
  }, [])

  const row = 'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left'
  return (
    <div className="mt-5 space-y-2">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink-faint">
        Set up now, never think about it again
      </p>
      <button
        disabled={notif === 'granted' || notif === 'unsupported'}
        onClick={() => {
          void enableReminders().then(() =>
            setNotif(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission),
          )
        }}
        className={`${row} ${notif === 'granted' ? 'border-lime/40 bg-lime/8' : 'border-edge bg-white/[0.07]'}`}
      >
        <span>
          <span className={`block text-[13.5px] font-bold ${notif === 'granted' ? 'text-lime' : 'text-ink'}`}>
            {notif === 'granted' ? '✓ Notifications on' : 'Turn on notifications'}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
            Two workout nudges a day max, weekly check-in day, milestone reviews. Never spam.
          </span>
        </span>
      </button>
      <button
        disabled={geo === 'granted' || geo === 'unsupported'}
        onClick={() =>
          navigator.geolocation.getCurrentPosition(
            () => setGeo('granted'),
            () => setGeo('denied'),
            { timeout: 10000 },
          )
        }
        className={`${row} ${geo === 'granted' ? 'border-lime/40 bg-lime/8' : 'border-edge bg-white/[0.07]'}`}
      >
        <span>
          <span className={`block text-[13.5px] font-bold ${geo === 'granted' ? 'text-lime' : 'text-ink'}`}>
            {geo === 'granted' ? '✓ Location on' : 'Allow location'}
          </span>
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-faint">
            Only for the GPS run/ride tracker. Maps your route, measures distance and pace.
          </span>
        </span>
      </button>
      <p className="text-[10.5px] leading-snug text-ink-faint">
        Both optional, you can do this later in Settings. Nothing leaves your phone.
      </p>
    </div>
  )
}
