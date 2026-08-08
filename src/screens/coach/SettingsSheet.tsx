import { Sheet } from '../../components/Sheet'
import { Toggle } from '../../components/ui'
import { useAppStore } from '../../store/appStore'
import { mondayOf } from '../../engine/calendar'

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore((s) => s.data.settings)
  const update = useAppStore((s) => s.update)

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-4 pb-6">
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
      </div>
    </Sheet>
  )
}
