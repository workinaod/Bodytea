/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

// ============================================================
// Custom service worker: precache (PWA offline) + best-effort
// background training reminders via Periodic Background Sync
// (Android/Chromium installed PWAs) + notification click focus.
// ============================================================

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[]
}

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

// ---- Meta mirror (the page writes this; localStorage is unreachable here) ----

interface ReminderMeta {
  enabled: boolean
  times: string[]
  todayDate: string
  todayScheduled: boolean
  todayDone: boolean
  todayTitle: string
  /** Absent in mirrors written by older app versions, treat as "no nudge". */
  cardioLoggedToday?: boolean
  lastNotifiedAt: string | null
  reviewReadyMark?: string | null
  reviewReadyLabel?: string
  reviewNotifiedMark?: string | null
  checkinDueToday?: boolean
  checkinNotifiedDate?: string | null
  missNotifiedDate?: string | null
  makeupTitle?: string | null
  makeupNotifiedDate?: string | null
  /** Notifications shown and not yet read. Mirrors store/storage.ts. */
  badgeCount?: number
}

function readMeta(): Promise<ReminderMeta | null> {
  return new Promise((resolve) => {
    const open = indexedDB.open('naod-photos', 2)
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('photos')) open.result.createObjectStore('photos')
      if (!open.result.objectStoreNames.contains('meta')) open.result.createObjectStore('meta')
    }
    open.onerror = () => resolve(null)
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction('meta', 'readonly')
        const req = tx.objectStore('meta').get('reminders')
        req.onsuccess = () => resolve((req.result as ReminderMeta | undefined) ?? null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    }
  })
}

function writeMeta(meta: ReminderMeta, patch: Partial<ReminderMeta>): Promise<void> {
  return new Promise((resolve) => {
    const open = indexedDB.open('naod-photos', 2)
    open.onerror = () => resolve()
    open.onsuccess = () => {
      try {
        const tx = open.result.transaction('meta', 'readwrite')
        tx.objectStore('meta').put({ ...meta, ...patch }, 'reminders')
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    }
  })
}

/**
 * Count one delivered notification on the app icon.
 *
 * The badge may only ever be raised alongside a message the user can
 * actually open. Reading it back from meta rather than tracking it here
 * keeps the page and the worker on one number.
 */
async function bumpBadge(meta: ReminderMeta): Promise<void> {
  const count = (meta.badgeCount ?? 0) + 1
  await writeMeta(meta, { badgeCount: count })
  try {
    await (navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> }).setAppBadge?.(
      count,
    )
  } catch {
    /* unsupported */
  }
}

const NUDGES = [
  'Session still open. The plan works when you do.',
  'Your workout is waiting. Ten minutes gets the minimum done.',
  'Still nothing logged today. The Sergeant is watching the clock.',
  'Training day. Future-you already said yes. Go.',
  'The streak survives on days exactly like this one.',
]

async function maybeNotify(): Promise<void> {
  const meta = await readMeta()
  if (!meta?.enabled) return

  // Milestone review unlocked → one push per mark, ever. Fires outside
  // the daily throttle: three of these a year is not spam.
  if (meta.reviewReadyMark && meta.reviewNotifiedMark !== meta.reviewReadyMark) {
    await self.registration.showNotification(
      `BodyT · ${meta.reviewReadyLabel || 'Milestone review'} is ready`,
      {
        body: 'Deltas, before/after, and the honest read on gains vs effort. Two minutes. You earned the look.',
        tag: 'naod-review-ready',
        icon: 'icons/pwa-192.png',
        badge: 'icons/pwa-192.png',
      },
    )
    await writeMeta(meta, { reviewNotifiedMark: meta.reviewReadyMark })
    meta.reviewNotifiedMark = meta.reviewReadyMark
  }

  const now0 = new Date()
  const today0 = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, '0')}-${String(now0.getDate()).padStart(2, '0')}`
  if (meta.checkinDueToday && now0.getHours() >= 8 && meta.checkinNotifiedDate !== today0 && meta.todayDate === today0) {
    await self.registration.showNotification('BodyT · Weekly check-in day', {
      body: 'Two minutes with the scale and the tape. The trends only work if you feed them.',
      tag: 'naod-checkin',
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-192.png',
    })
    await writeMeta(meta, { checkinNotifiedDate: today0 })
    meta.checkinNotifiedDate = today0
  }

  // The Sergeant's 22:00 word on a missed day, one note, and a job to do
  // right there on the floor. Fires once per missed day, ever.
  if (
    meta.todayScheduled &&
    !meta.todayDone &&
    now0.getHours() >= 22 &&
    meta.missNotifiedDate !== today0 &&
    meta.todayDate === today0
  ) {
    const LINES = [
      "Missed today. Day's not over though: 30 sit-ups, right now, wherever you are. Then we're square.",
      "Today got away from you. Fine. 20 push-ups before bed. A missed session is survivable, a dropped standard isn't.",
      'No session logged. One-minute plank, right now. I forgive a day, I never forget a pattern.',
      "The workout didn't happen. So: 25 squats before bed. Show tomorrow-you that today-you still showed up.",
    ]
    let h = 0
    for (const ch of today0) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    await self.registration.showNotification('The Sergeant', {
      body: LINES[h % LINES.length],
      tag: 'naod-missed',
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-192.png',
    })
    await writeMeta(meta, { missNotifiedDate: today0 })
    meta.missNotifiedDate = today0
  }

  // Off-day make-up: a workout was missed this week and today is open.
  // One push per day, from 9am, the week is still winnable.
  if (
    meta.makeupTitle &&
    !meta.todayDone &&
    now0.getHours() >= 9 &&
    meta.makeupNotifiedDate !== today0 &&
    meta.todayDate === today0
  ) {
    await self.registration.showNotification('BodyT · Make-up day', {
      body: `You missed ${meta.makeupTitle} this week. Off day, open window. Let's make it up today.`,
      tag: 'naod-makeup-week',
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-192.png',
    })
    await writeMeta(meta, { makeupNotifiedDate: today0 })
    meta.makeupNotifiedDate = today0
  }

  if (!meta.todayScheduled) return
  if (meta.todayDone && meta.cardioLoggedToday !== false) return // nothing left to nudge

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (meta.todayDate !== today) return // stale mirror, the page refreshes it on open

  // only after the earliest configured reminder time
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const anyDue = meta.times.some((t) => {
    const [h, m] = t.split(':').map(Number)
    return minutesNow >= h * 60 + m
  })
  if (!anyDue) return

  // at most one background notification every 3 hours
  if (meta.lastNotifiedAt && Date.now() - new Date(meta.lastNotifiedAt).getTime() < 3 * 3600_000) return

  const cardioNudge = meta.todayDone && meta.cardioLoggedToday === false
  const body = cardioNudge
    ? 'Session done ✓. Any cardio today? Run or game, pre or post, log it.'
    : NUDGES[now.getDate() % NUDGES.length]
  await self.registration.showNotification(
    cardioNudge ? 'BodyT · Cardio check' : `BodyT · ${meta.todayTitle}`,
    {
      body,
      tag: cardioNudge ? 'naod-cardio-nudge' : 'naod-train-reminder',
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-192.png',
    },
  )
  await bumpBadge(meta)
  await writeMeta(meta, { lastNotifiedAt: new Date().toISOString() })
}

self.addEventListener('periodicsync', (event) => {
  const e = event as ExtendableEvent & { tag?: string }
  if (e.tag === 'naod-reminder') e.waitUntil(maybeNotify())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      // Acting on a notification reads it, so the badge goes with it.
      // The page clears it again on open; doing it here too means the
      // icon is clean before the window has even painted.
      try {
        await (
          navigator as Navigator & { clearAppBadge?: () => Promise<void> }
        ).clearAppBadge?.()
        const meta = await readMeta()
        if (meta) await writeMeta(meta, { badgeCount: 0 })
      } catch {
        /* badge is optional */
      }
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = all.find((c) => 'focus' in c)
      if (existing) await (existing as WindowClient).focus()
      else await self.clients.openWindow('./')
    })(),
  )
})
