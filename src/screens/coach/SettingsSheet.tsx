import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Toggle } from '../../components/ui'
import { VoicePicker } from './VoicePicker'
import { useAppStore } from '../../store/appStore'
import { mondayOf } from '../../engine/calendar'
import {
  disableReminders,
  enableReminders,
  notificationSupport,
  refreshReminders,
} from '../../logic/reminders'
import { deliveryCapability, deliveryNote } from '../../platform/notifications'

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function SettingsSheet({
  open,
  onClose,
  onOpenAccount,
  onOpenData,
  backupDays,
}: {
  open: boolean
  onClose: () => void
  onOpenAccount: () => void
  onOpenData: () => void
  /** Days since the last export, null if it has never happened. */
  backupDays: number | null
}) {
  const settings = useAppStore((s) => s.data.settings)
  const update = useAppStore((s) => s.update)
  const [notifDenied, setNotifDenied] = useState(false)
  const support = notificationSupport()
  const capability = deliveryCapability()

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
            sub="Max two nudges a day, only while a training day sits unfinished."
          />
          {/* What this device can actually do, rather than what the feature
              wishes it could. A switch that silently does nothing is worse
              than one that says where its limits are. */}
          {settings.remindersEnabled && (
            <p className="mt-1.5 text-label leading-snug text-ink-faint">{deliveryNote(capability)}</p>
          )}
          {notifDenied && (
            <p className="mt-1.5 text-[11.5px] font-semibold text-danger">
              Notifications are blocked{support === 'unsupported' ? ' (not supported here)' : '. Allow them in your browser/app settings, then flip this again'}.
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
                    className="rounded-xl bg-white/[0.07] px-2 py-2.5 text-center text-[13px] font-bold outline-none [color-scheme:dark]"
                  />
                ))}
              </div>
              <p className="mt-1.5 text-[10.5px] leading-snug text-ink-faint">
                Only on training days with no finished session.
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
            className="w-full rounded-xl bg-white/[0.07] px-3.5 py-3 text-[14px] outline-none [color-scheme:dark]"
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
                className={`rounded-lg px-2 py-2 text-[11px] font-bold ${settings.checkinWeekday === i ? 'bg-accent text-black' : 'bg-white/[0.07] text-ink-faint'}`}
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
                className={`rounded-lg px-2 py-2.5 text-[12px] font-bold ${settings.trainingDayKcalBonus === b ? 'bg-accent text-black' : 'bg-white/[0.07] text-ink-faint'}`}
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

        {settings.voiceCoach !== false && <VoicePicker />}

        {/* Account and backup used to be their own two buttons in the
            header, next to a shouting yellow banner. Three entry points
            for things you touch once a month. They live here now, and
            the backup age is a quiet line instead of an alarm. */}
        <div className="overflow-hidden rounded-2xl ring-1 ring-white/[0.07]">
          <SettingsRow
            label="Account"
            sub="Sign in, cloud backup, leaderboard name"
            onClick={() => {
              onClose()
              onOpenAccount()
            }}
          />
          <SettingsRow
            label="Backup and data"
            sub={
              backupDays === null
                ? 'Never backed up. It all lives on this phone.'
                : backupDays >= 7
                  ? `${backupDays} days since your last backup.`
                  : `Backed up ${backupDays === 0 ? 'today' : `${backupDays} day${backupDays === 1 ? '' : 's'} ago`}.`
            }
            warn={backupDays === null || backupDays >= 7}
            onClick={() => {
              onClose()
              onOpenData()
            }}
          />
        </div>
      </div>
    </Sheet>
  )
}

function SettingsRow({
  label,
  sub,
  warn = false,
  onClick,
}: {
  label: string
  sub: string
  warn?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] bg-white/[0.03] px-4 py-3.5 text-left last:border-b-0 active:bg-white/[0.08]"
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-extrabold">{label}</span>
        <span className={`mt-0.5 block text-[11.5px] leading-snug ${warn ? 'text-gold' : 'text-ink-faint'}`}>
          {sub}
        </span>
      </span>
      <span className="shrink-0 text-[16px] text-ink-faint">›</span>
    </button>
  )
}
