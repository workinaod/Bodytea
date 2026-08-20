import { useAppStore } from '../../store/appStore'
import { Tile, Toggle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { useState } from 'react'
import { DataTransferSheet } from './DataTransferSheet'

// ============================================================
// Connected apps, told truthfully.
//
// The research is unambiguous and it is in this repo: a web app
// CANNOT read Apple Health, at any version, ever. That arrives
// with the native build. So the rows exist, they look like what
// they will be, and every one says exactly what it is waiting
// on. No connect button does nothing.
//
// The one data feature that IS real today sits at the bottom:
// export and import, which has worked since week two.
// ============================================================

const SOURCES = [
  { name: 'Apple Health', when: 'with the native app' },
  { name: 'Google Health', when: 'with the native app' },
  { name: 'Garmin', when: 'after the native app' },
  { name: 'Strava', when: 'after the native app' },
  { name: 'Oura', when: 'after the native app' },
]

export function ConnectedAppsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const interest = useAppStore((s) => s.data.settings.healthSyncInterest ?? false)
  const update = useAppStore((s) => s.update)
  const [dataOpen, setDataOpen] = useState(false)

  return (
    <Sheet open={open} onClose={onClose} title="Connected apps">
      <div className="space-y-2 pb-6">
        {SOURCES.map((s) => (
          <Tile key={s.name} className="!py-3">
            <div className="flex items-baseline justify-between gap-3">
              <b className="text-[14px] font-black">{s.name}</b>
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.1em] text-accent-soft">
                {s.when}
              </span>
            </div>
          </Tile>
        ))}

        <p className="px-1 pt-1 text-[12px] font-bold leading-snug text-ink-dim">
          BodyT is a web app today. It already reads this phone's GPS, motion and in-session steps.
          Wearable sync lands with the native build.
        </p>

        <Toggle
          on={interest}
          onChange={(v) => update((d) => (d.settings.healthSyncInterest = v))}
          label="Tell me when it lands"
          sub="Nothing is sent anywhere. It is a note to this phone."
        />

        <Tile onClick={() => setDataOpen(true)} ariaLabel="Your data" className="!py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-black">Your data</div>
              <div className="mt-px text-[10.5px] font-bold text-ink-faint">
                Export or import everything. This one is real today.
              </div>
            </div>
            <span className="text-[16px] font-black text-ink-faint">›</span>
          </div>
        </Tile>
      </div>
      <DataTransferSheet open={dataOpen} onClose={() => setDataOpen(false)} />
    </Sheet>
  )
}
