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
  /** Absent in mirrors written by older app versions — treat as "no nudge". */
  cardioLoggedToday?: boolean
  lastNotifiedAt: string | null
  reviewReadyMark?: string | null
  reviewReadyLabel?: string
  reviewNotifiedMark?: string | null
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

const NUDGES = [
  'Session still open. The plan works when you do.',
  'Your workout is waiting. Ten minutes gets the minimum done.',
  'Still nothing logged today. The Sergeant is watching the clock.',
  "Training day. Future-you already said yes — go.",
  'The streak survives on days exactly like this one.',
]

async function maybeNotify(): Promise<void> {
  const meta = await readMeta()
  if (!meta?.enabled) return

  // Milestone review unlocked → one push per mark, ever. Fires outside
  // the daily throttle: three of these a year is not spam.
  if (meta.reviewReadyMark && meta.reviewNotifiedMark !== meta.reviewReadyMark) {
    await self.registration.showNotification(
      `Bodytea — ${meta.reviewReadyLabel || 'Milestone review'} is ready`,
      {
        body: 'Deltas, before/after, and the honest read on gains vs effort. Two minutes — you earned the look.',
        tag: 'naod-review-ready',
        icon: 'icons/pwa-192.png',
        badge: 'icons/pwa-192.png',
      },
    )
    await writeMeta(meta, { reviewNotifiedMark: meta.reviewReadyMark })
    meta.reviewNotifiedMark = meta.reviewReadyMark
  }

  if (!meta.todayScheduled) return
  if (meta.todayDone && meta.cardioLoggedToday !== false) return // nothing left to nudge

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (meta.todayDate !== today) return // stale mirror — the page refreshes it on open

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
    ? 'Session done ✓ — was there cardio today? Pre or post, run or game: log what happened.'
    : NUDGES[now.getDate() % NUDGES.length]
  await self.registration.showNotification(
    cardioNudge ? 'Bodytea — Cardio check' : `Bodytea — ${meta.todayTitle}`,
    {
      body,
      tag: cardioNudge ? 'naod-cardio-nudge' : 'naod-train-reminder',
      icon: 'icons/pwa-192.png',
      badge: 'icons/pwa-192.png',
    },
  )
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
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = all.find((c) => 'focus' in c)
      if (existing) await (existing as WindowClient).focus()
      else await self.clients.openWindow('./')
    })(),
  )
})
