import { MetaStore, type ReminderMeta } from '../store/storage'
import { useAppStore } from '../store/appStore'
import { resolveDay, weekStateFor } from '../engine/resolveDay'
import { makeupCandidate } from '../engine/reconcile'
import { reviewReady } from '../engine/review'
import { todayISO } from '../engine/calendar'
import {
  clearBadge,
  notificationSupport,
  requestNotificationPermission,
  setBadge,
  showNotification,
} from '../platform/notifications'

// ============================================================
// Training reminders, layered best effort:
//  1. In-page timers while the app is open (everywhere)
//  2. Periodic Background Sync via the SW (Android/Chromium installs)
// The page mirrors state into IndexedDB so the SW can decide alone.
//
// The badge is NOT a third layer. It counts notifications that were
// actually shown, and opening the app clears it, because opening the
// app is reading them. See platform/notifications.ts for why.
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
  // Rest day + a workout missed this week + nothing trained yet → the
  // off-day make-up push has something to say
  const makeup = resolved.kind === 'rest' && !log ? makeupCandidate(data, date) : null
  return { date, scheduled, done, cardioLogged, title: resolved.title, makeupTitle: makeup?.title ?? null }
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
    missNotifiedDate: prev?.missNotifiedDate ?? null,
    makeupTitle: t.makeupTitle,
    makeupNotifiedDate: prev?.makeupNotifiedDate ?? null,
    badgeCount: prev?.badgeCount ?? 0,
  }
  await MetaStore.set(meta).catch(() => {})

  // Milestone-review push, page-side (covers platforms without periodic
  // sync). Once per mark, ever, three notifications a year, tops.
  if (settings.remindersEnabled && ready && meta.reviewNotifiedMark !== ready.id) {
    const shown = await showLocalReminder(
      `${ready.label} is ready`,
      'Deltas, before/after, and the honest read on gains vs effort. Two minutes. You earned the look.',
      'naod-review-ready',
    )
    if (shown) await MetaStore.set({ ...meta, reviewNotifiedMark: ready.id }).catch(() => {})
  }
}

/**
 * Show a reminder and count it on the badge.
 *
 * The badge is only ever raised here, on a delivery that actually
 * happened, so it can never outlive a message the user can read.
 */
async function showLocalReminder(
  title: string,
  body: string,
  tag = 'naod-train-reminder',
): Promise<boolean> {
  const shown = await showNotification(title, body, tag)
  if (!shown) return false
  const meta = await MetaStore.get().catch(() => null)
  const count = (meta?.badgeCount ?? 0) + 1
  if (meta) await MetaStore.set({ ...meta, badgeCount: count }).catch(() => {})
  await setBadge(count)
  return true
}

/**
 * The app is open, so every notification behind the badge has been read.
 * This is the only thing that clears it, and it runs on every open, so a
 * badge can never survive a visit.
 */
export async function markNotificationsRead(): Promise<void> {
  await clearBadge()
  const meta = await MetaStore.get().catch(() => null)
  if (meta && (meta.badgeCount ?? 0) !== 0) {
    await MetaStore.set({ ...meta, badgeCount: 0 }).catch(() => {})
  }
}

/** (Re)arm in-page timers for today's remaining reminder times. */
export function armPageTimers(): void {
  for (const t of pageTimers) clearTimeout(t)
  pageTimers = []
  const { settings } = useAppStore.getState().data
  if (!settings.remindersEnabled || notificationSupport() !== 'granted') return

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
          // session's in, the daily cardio question is still open
          void showLocalReminder(
            'Cardio check',
            'Session done. Any cardio today? Run or game, pre or post, log it.',
            'naod-cardio-nudge',
          )
        }
      }, delay),
    )
  }
}

/** Ask permission + register periodic sync. Returns whether notifications are granted. */
export async function enableReminders(): Promise<boolean> {
  if (!(await requestNotificationPermission())) return false

  useAppStore.getState().update((d) => {
    d.settings.remindersEnabled = true
  })

  // Periodic background sync. Android/Chromium installed PWAs only
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) as
      | (ServiceWorkerRegistration & {
          periodicSync?: { register: (tag: string, opts: { minInterval: number }) => Promise<void> }
        })
      | undefined
    await reg?.periodicSync?.register('naod-reminder', { minInterval: 3 * 3600_000 })
  } catch {
    /* not supported, page timers + badge still work */
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
  // Turning reminders off must take the badge with it, or a number sits
  // there forever with nothing left that could ever clear it.
  void markNotificationsRead()
  void syncReminderMeta()
}

/** Call on app open / visibility gain / store changes. */
export function refreshReminders(): void {
  // Being here means every pending notification has been seen.
  void markNotificationsRead()
  void syncReminderMeta()
  armPageTimers()
}

export { notificationSupport } from '../platform/notifications'
