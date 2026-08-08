import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import { TabBar, type TabId } from './components/TabBar'
import { TodayScreen } from './screens/today/TodayScreen'
import { WeekScreen } from './screens/week/WeekScreen'
import { MealsScreen } from './screens/meals/MealsScreen'
import { ProgressScreen } from './screens/progress/ProgressScreen'
import { CoachScreen } from './screens/coach/CoachScreen'
import { Onboarding } from './screens/Onboarding'
import { ReconcileSheet } from './screens/ReconcileSheet'
import { dailyCoachSweep } from './logic/actions'
import { refreshReminders, syncReminderMeta } from './logic/reminders'
import { startClock, useToday } from './logic/clock'
import { mondayOf } from './engine/calendar'

export default function App() {
  const onboarded = useAppStore((s) => s.data.settings.onboarded)
  const today = useToday()
  const monday = mondayOf(today)
  const weekPicked = useAppStore((s) => !!s.data.weeks[monday]?.tierPickedAt)
  const [tab, setTab] = useState<TabId>('today')

  useEffect(() => {
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

      <TabBar tab={tab} onChange={setTab} alert={{ week: !weekPicked }} />
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
    <div className="fixed inset-x-4 top-3 z-[70] mx-auto flex max-w-lg items-center justify-between rounded-2xl border border-cyan/30 bg-bg/95 px-4 py-3 shadow-2xl backdrop-blur">
      <span className="text-[13px] font-bold text-cyan">Update ready</span>
      <div className="flex gap-2">
        <button className="rounded-lg bg-surface-2 px-3 py-1.5 text-[12px] font-bold text-ink-dim" onClick={() => setShow(false)}>
          After my session
        </button>
        <button className="rounded-lg bg-cyan px-3 py-1.5 text-[12px] font-black text-black" onClick={() => reload?.()}>
          Update now
        </button>
      </div>
    </div>
  )
}
