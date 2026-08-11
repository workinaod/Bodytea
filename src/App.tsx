import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import { TabBar, type TabId } from './components/TabBar'
import { Sheet } from './components/Sheet'
import { TodayScreen } from './screens/today/TodayScreen'
import { WeekScreen } from './screens/week/WeekScreen'
import { MealsScreen } from './screens/meals/MealsScreen'
import { ProgressScreen } from './screens/progress/ProgressScreen'
import { CoachScreen } from './screens/coach/CoachScreen'
import { RunTrackerSheet } from './screens/today/RunTrackerSheet'
import { Onboarding } from './screens/Onboarding'
import { ReconcileSheet } from './screens/ReconcileSheet'
import { dailyCoachSweep } from './logic/actions'
import { refreshReminders, syncReminderMeta } from './logic/reminders'
import { startClock, useToday } from './logic/clock'

export default function App() {
  const onboarded = useAppStore((s) => s.data.settings.onboarded)
  const today = useToday()
  const [tab, setTab] = useState<TabId>('today')
  const [track, setTrack] = useState<'choose' | 'run' | 'bike' | null>(null)

  useEffect(() => {
    // Cloud sync restores only for devices that have used an account —
    // local-only users never load (or run) the network code path.
    if (localStorage.getItem('bodytea.sync')) {
      void import('./cloud/sync').then((m) => m.initCloudSync()).catch(() => {})
    }
    // the heartbeat that keeps the whole app on the real current day
    startClock(() => {
      dailyCoachSweep()
      refreshReminders()
    })
    if (onboarded) {
      dailyCoachSweep()
      refreshReminders()
    }
    // re-run when the app returns to the foreground (possibly on a new day)
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        dailyCoachSweep()
        refreshReminders()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    // keep the SW's reminder mirror + app badge in sync with state changes
    let metaTimer: ReturnType<typeof setTimeout> | null = null
    const unsub = useAppStore.subscribe(() => {
      if (metaTimer) clearTimeout(metaTimer)
      metaTimer = setTimeout(() => void syncReminderMeta(), 800)
    })
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      unsub()
      if (metaTimer) clearTimeout(metaTimer)
    }
  }, [onboarded])

  if (!onboarded) return <Onboarding />

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28 pt-[max(env(safe-area-inset-top),16px)]">
      {tab === 'today' && <TodayScreen />}
      {tab === 'week' && <WeekScreen />}
      {tab === 'meals' && <MealsScreen />}
      {tab === 'progress' && <ProgressScreen />}
      {tab === 'coach' && <CoachScreen />}

      <TabBar tab={tab} onChange={setTab} onTrack={() => setTrack('choose')} />
      <Sheet open={track === 'choose'} onClose={() => setTrack(null)} title="Track with GPS">
        <div className="space-y-2 pb-8">
          <p className="text-[12.5px] leading-snug text-ink-dim">
            Live map, time, distance, and pace — finishing logs it as today's cardio automatically.
          </p>
          {(
            [
              { id: 'run', label: 'Run', sub: 'pace per mile + splits' },
              { id: 'bike', label: 'Ride', sub: 'average mph + route' },
            ] as const
          ).map((a) => (
            <button
              key={a.id}
              onClick={() => setTrack(a.id)}
              className="flex w-full items-center justify-between rounded-2xl border border-edge bg-surface-2 px-4 py-4 text-left active:border-accent/40"
            >
              <span>
                <span className="block text-[15px] font-extrabold">{a.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-ink-faint">{a.sub}</span>
              </span>
              <span className="text-[17px] font-bold text-accent">→</span>
            </button>
          ))}
        </div>
      </Sheet>
      {(track === 'run' || track === 'bike') && (
        <RunTrackerSheet activity={track} date={today} onClose={() => setTrack(null)} />
      )}
      <ReconcileSheet />
      <UpdateToast />
    </div>
  )
}

function UpdateToast() {
  const [show, setShow] = useState(false)
  const [reload, setReload] = useState<(() => void) | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<() => void>).detail
      setReload(() => detail)
      setShow(true)
    }
    window.addEventListener('naod:sw-update', handler)
    return () => window.removeEventListener('naod:sw-update', handler)
  }, [])

  if (!show) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setShow(false)} />
      <div className="relative w-full max-w-sm rounded-2xl border border-cyan/30 bg-bg p-5 shadow-2xl animate-fade-in">
        <h3 className="text-[17px] font-black tracking-tight text-cyan">Update ready</h3>
        <p className="mt-1 text-[13px] leading-snug text-ink-dim">
          A new version of the app is available.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            className="w-full rounded-xl bg-cyan py-3 text-[14px] font-black text-black active:scale-[0.98]"
            onClick={() => reload?.()}
          >
            Update now
          </button>
          <button
            className="w-full rounded-xl bg-surface-2 py-3 text-[13px] font-bold text-ink-dim active:scale-[0.98]"
            onClick={() => setShow(false)}
          >
            After my session
          </button>
        </div>
      </div>
    </div>
  )
}
