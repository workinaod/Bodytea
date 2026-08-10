import { MetaStore, type ReminderMeta } from '../store/storage'
import { useAppStore } from '../store/appStore'
import { resolveDay, weekStateFor } from '../engine/resolveDay'
import { reviewReady } from '../engine/review'
import { todayISO } from '../engine/calendar'

// ============================================================
// Training reminders, serverless edition — layered best effort:
//  1. In-page timers while the app is open/backgrounded (everywhere)
//  2. Periodic Background Sync via the SW (Android/Chromium installs)
//  3. App icon badge while today's session is unfinished (iOS + Android)
// The page mirrors state into IndexedDB so the SW can decide alone.
// ============================================================

let pageTimers: ReturnType<typeof setTimeout>[] = []

function todayState() {
  const data = useAppStore.getState().data
  const date = todayISO()
  const resolved = resolveDay(date, data)
  const scheduled = resolved.kind === 'session' || resolved.kind === 'cardio-backup'
  const log = data.sessions[date]
  const done = !!log && (log.status === 'completed' || log.status === 'downgraded-completed' || log.status === 'skipped' || !!log.endedAt)
  const cardioLogged = (data.cardio[date]?.length ?? 0) > 0 || weekStateFor(data, date).ballDates.includes(date)
  return { date, scheduled, done, cardioLogged, title: resolved.title }
}

/** Mirror reminder config + today's status into IDB (SW reads it) + badge. */
export async function syncReminderMeta(): Promise<void> {
  const data = useAppStore.getState().data
  const { settings } = data
  const t = todayState()
  const prev = await MetaStore.get().catch(() => null)
  const ready = reviewReady(data, todayISO())
  const today = todayISO()
  const checkinDueToday =
    new Date().getDay() === settings.checkinWeekday &&
    !data.measurements.some((m) => m.date === today)
  const meta: ReminderMeta = {
    enabled: settings.remindersEnabled,
    times: settings.reminderTimes,
    todayDate: t.date,
    todayScheduled: t.scheduled,
    todayDone: t.done,
    todayTitle: t.title,
    cardioLoggedToday: t.cardioLogged,
    lastNotifiedAt: prev?.todayDate === t.date ? (prev?.lastNotifiedAt ?? null) : null,
    reviewReadyMark: ready?.id ?? null,
    reviewReadyLabel: ready?.label ?? '',
    reviewNotifiedMark: prev?.reviewNotifiedMark ?? null,
    checkinDueToday,
    checkinNotifiedDate: prev?.checkinNotifiedDate ?? null,
  }
  await MetaStore.set(meta).catch(() => {})

  // Milestone-review push, page-side (covers platforms without periodic
  // sync). Once per mark, ever — three notifications a year, tops.
  if (
    settings.remindersEnabled &&
    ready &&
    meta.reviewNotifiedMark !== ready.id &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    await showLocalReminder(
      `${ready.label} is ready`,
      'Deltas, before/after, and the honest read on gains vs effort. Two minutes — you earned the look.',
      'naod-review-ready',
    ).catch(() => {})
    await MetaStore.set({ ...meta, reviewNotifiedMark: ready.id }).catch(() => {})
  }

  // App badge: a quiet, iOS-friendly "you still owe a session" signal
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    if (t.scheduled && !t.done && settings.remindersEnabled) await nav.setAppBadge?.(1)
    else await nav.clearAppBadge?.()
  } catch {
    /* unsupported */
  }
}

async function showLocalReminder(title: string, body: string, tag = 'naod-train-reminder'): Promise<void> {
  if (Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  await reg?.showNotification(`Bodytea — ${title}`, {
    body,
    tag,
    icon: 'icons/pwa-192.png',
    badge: 'icons/pwa-192.png',
  })
}

/** (Re)arm in-page timers for today's remaining reminder times. */
export function armPageTimers(): void {
  for (const t of pageTimers) clearTimeout(t)
  pageTimers = []
  const { settings } = useAppStore.getState().data
  if (!settings.remindersEnabled || Notification.permission !== 'granted') return

  const now = new Date()
  for (const hm of settings.reminderTimes) {
    const [h, m] = hm.split(':').map(Number)
    const fire = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0)
    const delay = fire.getTime() - now.getTime()
    if (delay <= 0) continue
    pageTimers.push(
      setTimeout(() => {
        const t = todayState()
        if (t.scheduled && !t.done) {
          void showLocalReminder(t.title, 'Session still open today. Even the 10-minute minimum counts.')
        } else if (t.scheduled && t.done && !t.cardioLogged) {
          // session's in — the daily cardio question is still open
          void showLocalReminder(
            'Cardio check',
            'Session done ✓ — was there cardio today? Pre or post, run or game: log what happened.',
            'naod-cardio-nudge',
          )
        }
      }, delay),
    )
  }
}

/** Ask permission + register periodic sync. Returns whether notifications are granted. */
export async function enableReminders(): Promise<boolean> {
  if (!('Notification' in window)) return false
  let permission = Notification.permission
  if (permission === 'default') permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  useAppStore.getState().update((d) => {
    d.settings.remindersEnabled = true
  })

  // Periodic background sync — Android/Chromium installed PWAs only
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) as
      | (ServiceWorkerRegistration & {
          periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> }
        })
      | undefined
    await reg?.periodicSync?.register('naod-reminder', { minInterval: 3 * 3600_000 })
  } catch {
    /* not supported — page timers + badge still work */
  }

  await syncReminderMeta()
  armPageTimers()
  return true
}

export function disableReminders(): void {
  useAppStore.getState().update((d) => {
    d.settings.remindersEnabled = false
  })
  for (const t of pageTimers) clearTimeout(t)
  pageTimers = []
  void syncReminderMeta()
}

/** Call on app open / visibility gain / store changes. */
export function refreshReminders(): void {
  void syncReminderMeta()
  armPageTimers()
}

export function notificationSupport(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}
