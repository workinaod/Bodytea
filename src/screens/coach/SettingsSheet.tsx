import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Toggle } from '../../components/ui'
import { useAppStore } from '../../store/appStore'
import { mondayOf } from '../../engine/calendar'
import {
  disableReminders,
  enableReminders,
  notificationSupport,
  refreshReminders,
} from '../../logic/reminders'

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore((s) => s.data.settings)
  const update = useAppStore((s) => s.update)
  const [notifDenied, setNotifDenied] = useState(false)
  const support = notificationSupport()

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-4 pb-6">
        <div>
          <Toggle
            on={settings.remindersEnabled}
            onChange={async (v) => {
              setNotifDenied(false)
              if (v) {
                const ok = await enableReminders()
                if (!ok) setNotifDenied(true)
              } else {
                disableReminders()
              }
            }}
            label="Training reminders"
            sub="Max two nudges a day, only on training days with an unfinished session — plus a badge on the app icon until it's done."
          />
          {notifDenied && (
            <p className="mt-1.5 text-[11.5px] font-semibold text-danger">
              Notifications are blocked{support === 'unsupported' ? ' (not supported here)' : ' — allow them in your browser/app settings, then flip this again'}.
            </p>
          )}
          {settings.remindersEnabled && (
            <div className="mt-2.5">
              <div className="mb-1 text-[12px] font-bold text-ink-dim">Remind me around (two a day, max)</div>
              <div className="grid grid-cols-3 gap-1.5">
                {settings.reminderTimes.map((t, i) => (
                  <input
                    key={i}
                    type="time"
                    value={t}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      update((d) => {
                        d.settings.reminderTimes[i] = v
                      })
                      refreshReminders()
                    }}
                    className="rounded-xl border border-edge bg-surface-2 px-2 py-2.5 text-center text-[13px] font-bold outline-none [color-scheme:dark]"
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[10.5px] leading-snug text-ink-faint">
                Reminders only fire on training days with no finished session. Background delivery works
                best installed on Android; on iPhone you'll get the app-icon badge plus reminders when
                you open or switch back to the app (no server = no iOS background push).
              </p>
            </div>
          )}
        </div>
        <div>
          <div className="mb-1 text-[12px] font-bold text-ink-dim">Phase start (Monday of week 1)</div>
          <input
            type="date"
            value={settings.phaseStartDate}
            onChange={(e) => {
              const v = e.target.value
              if (v) update((d) => { d.settings.phaseStartDate = mondayOf(v) })
            }}
            className="w-full rounded-xl border border-edge bg-surface-2 px-3.5 py-3 text-[14px] outline-none [color-scheme:dark]"
          />
          <p className="mt-1 text-[10.5px] text-ink-faint">Snaps to that week's Monday. Blocks, deloads, and A/B weeks all count from here.</p>
        </div>

        <div>
          <div className="mb-1 text-[12px] font-bold text-ink-dim">Weekly check-in morning</div>
          <div className="grid grid-cols-4 gap-1.5">
            {WD.map((w, i) => (
              <button
                key={w}
                onClick={() => update((d) => { d.settings.checkinWeekday = i as 0 | 1 | 2 | 3 | 4 | 5 | 6 })}
                className={`rounded-lg px-2 py-2 text-[11px] font-bold ${settings.checkinWeekday === i ? 'bg-accent text-black' : 'bg-surface-2 text-ink-faint'}`}
              >
                {w.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[12px] font-bold text-ink-dim">
            Training-day calorie bonus (the 3–4 week check-in rule)
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 150, 200].map((b) => (
              <button
                key={b}
                onClick={() => update((d) => { d.settings.trainingDayKcalBonus = b as 0 | 150 | 200 })}
                className={`rounded-lg px-2 py-2.5 text-[12px] font-bold ${settings.trainingDayKcalBonus === b ? 'bg-accent text-black' : 'bg-surface-2 text-ink-faint'}`}
              >
                {b === 0 ? 'none' : `+${b} kcal`}
              </button>
            ))}
          </div>
        </div>

        <Toggle
          on={settings.restTimerEnabled}
          onChange={(v) => update((d) => { d.settings.restTimerEnabled = v })}
          label="Auto rest timer"
          sub="Starts when you check off a set. Explosive work gets the full recovery."
        />

        <Toggle
          on={settings.voiceCoach ?? true}
          onChange={(v) => update((d) => { d.settings.voiceCoach = v })}
          label="Voice coach"
          sub="Spoken rep counting, hold timers, and next-exercise briefings in focus mode."
        />
      </div>
    </Sheet>
  )
}
