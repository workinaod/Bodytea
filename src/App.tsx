import { useEffect, useState } from 'react'
import type { GpsActivity } from './activityTypes'
import { setPreferredVoice } from './platform/speech'
import { useAppStore } from './store/appStore'
import { TabBar, type TabId } from './components/TabBar'
import { TodayScreen } from './screens/today/TodayScreen'
import { WeekScreen } from './screens/week/WeekScreen'
import { MealsScreen } from './screens/meals/MealsScreen'
import { ProgressScreen } from './screens/progress/ProgressScreen'
import { CoachScreen } from './screens/coach/CoachScreen'
import { RunTrackerSheet } from './screens/today/RunTrackerSheet'
import { TrackSheet } from './screens/today/TrackSheet'
import { CardioTimerSheet } from './screens/today/CardioTimerSheet'
import { Onboarding } from './screens/onboarding'
import { ReconcileSheet } from './screens/ReconcileSheet'
import { dailyCoachSweep } from './logic/actions'
import { refreshReminders, syncReminderMeta } from './logic/reminders'
import { startClock, useToday } from './logic/clock'
import { lateNightGraceDate } from './engine/rollover'

export default function App() {
  const onboarded = useAppStore((s) => s.data.settings.onboarded)
  const data = useAppStore((s) => s.data)
  const today = useToday()
  const [tab, setTab] = useState<TabId>('today')
  const [track, setTrack] = useState<'choose' | GpsActivity | null>(null)
  const [timerActivity, setTimerActivity] = useState<string | null>(null)
  // Only set when the user typed their own name in the custom row.
  const [timerLabel, setTimerLabel] = useState<string | undefined>(undefined)

  // A live session on the home date folds the tab bar into the glow strip
  // (only where the session UI actually is, the Today tab).
  const grace = lateNightGraceDate(data, today, new Date())
  // While the 12–3am window is open nothing else re-renders at 03:00,
  // this ticker makes the flip to the new day visible within a minute.
  const [, forceGraceTick] = useState(0)
  // The chosen coach voice has to reach the speech layer at boot, not
  // only while Settings is open. platform/ cannot read the store (that
  // would import upwards), so the shell hands it down.
  const voiceURI = data.settings.voiceURI
  useEffect(() => {
    setPreferredVoice(voiceURI)
  }, [voiceURI])
  useEffect(() => {
    if (!grace) return
    const id = window.setInterval(() => forceGraceTick((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [grace])
  const homeDate = grace ?? today
  const live = data.sessions[homeDate]
  const sessionLive = !!live && live.status === 'partial' && !live.endedAt && !!live.startedAt

  useEffect(() => {
    // Cloud sync restores only for devices that have used an account,
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
    <div className="mx-auto min-h-dvh max-w-lg px-5 pb-28 pt-[max(env(safe-area-inset-top),16px)]">
      {/* keyed wrapper: every tab switch rises in, screens feel placed, not
          swapped. No fill-mode: a retained transform would become the
          containing block for the fixed sheets inside the screens. */}
      <div key={tab} style={{ animation: 'rise 0.24s ease-out' }}>
        {tab === 'today' && <TodayScreen />}
        {tab === 'week' && <WeekScreen />}
        {tab === 'meals' && <MealsScreen />}
        {tab === 'progress' && <ProgressScreen />}
        {tab === 'coach' && <CoachScreen />}
      </div>
      <TabBar tab={tab} onChange={setTab} onTrack={() => setTrack('choose')} session={sessionLive && tab === 'today'} />
      <TrackSheet
        open={track === 'choose'}
        onClose={() => setTrack(null)}
        onPickGps={(id) => setTrack(id)}
        onPickTimed={(id, label) => {
          setTrack(null)
          setTimerActivity(id)
          setTimerLabel(label)
        }}
      />
      {track !== null && track !== 'choose' && (
        <RunTrackerSheet activity={track} date={today} onClose={() => setTrack(null)} />
      )}
      {timerActivity && (
        <CardioTimerSheet
          activityId={timerActivity}
          customLabel={timerLabel}
          date={today}
          onClose={() => {
            setTimerActivity(null)
            setTimerLabel(undefined)
          }}
        />
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px] animate-fade-in" onClick={() => setShow(false)} />
      <div className="relative w-full max-w-sm rounded-[26px] bg-[#141416]/95 ring-1 ring-white/[0.08] p-5 shadow-2xl backdrop-blur-2xl animate-fade-in">
        <h3 className="text-[17px] font-black tracking-tight text-cyan">Update ready</h3>
        <p className="mt-1 text-[13px] leading-snug text-ink-dim">
          A new version of the app is available.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            className="sheen w-full rounded-xl bg-gradient-to-b from-cyan to-[#4f93cc] py-3 text-[14px] font-black text-black shadow-lg shadow-cyan/20 active:scale-[0.98]"
            onClick={() => reload?.()}
          >
            Update now
          </button>
          <button
            className="w-full rounded-xl bg-white/[0.07] py-3 text-[13px] font-bold text-ink-dim transition-transform active:scale-[0.98]"
            onClick={() => setShow(false)}
          >
            After my session
          </button>
        </div>
      </div>
    </div>
  )
}
