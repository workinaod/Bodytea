// ============================================================
// Storage drivers. App state lives in localStorage as a single
// versioned Envelope; photo blobs live in IndexedDB. The driver
// interface exists so a cloud adapter can slot in later without
// touching the rest of the app.
// ============================================================

export interface StorageDriver {
  load(): string | null
  /** False means the write did NOT land. Callers must not ignore it. */
  save(raw: string): boolean
}

export const STATE_KEY = 'naod.state'

/**
 * Is this the browser saying "the disk is full"?
 *
 * Every engine spells it differently and older Firefox reports a bare
 * code, so the name check alone misses. Anything else — a security
 * policy, private mode with storage disabled — is still a failed write
 * and still has to be surfaced; this only decides which sentence the
 * user gets.
 */
export function isQuotaError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  const dom = e as DOMException
  return (
    dom.name === 'QuotaExceededError' ||
    dom.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    dom.code === 22 ||
    dom.code === 1014
  )
}

export class LocalStorageDriver implements StorageDriver {
  load(): string | null {
    try {
      return localStorage.getItem(STATE_KEY)
    } catch {
      return null
    }
  }
  /**
   * A failed write used to be a console line and a `void` return, so the
   * app could not tell a saved session from a lost one. Once localStorage
   * is full EVERY subsequent write fails: the user keeps training against
   * in-memory state that looks completely normal, and the next reload
   * silently rolls them back to whenever the quota ran out.
   *
   * That is the worst failure this app has, because its whole promise is
   * that the data is on the device. So the result comes back now, and
   * appStore raises a banner the moment one comes back false.
   */
  save(raw: string): boolean {
    try {
      localStorage.setItem(STATE_KEY, raw)
      return true
    } catch (e) {
      console.error('Failed to persist state', e)
      return false
    }
  }
}

// ---------- IndexedDB photo store ----------

const DB_NAME = 'naod-photos'
const STORE = 'photos'
const META_STORE = 'meta'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
      if (!req.result.objectStoreNames.contains(META_STORE)) {
        req.result.createObjectStore(META_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDB()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const req = fn(tx.objectStore(storeName))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Small key-value mirror the service worker reads (the SW cannot access
 * localStorage). Holds reminder config + today's training status.
 */
export interface ReminderMeta {
  enabled: boolean
  times: string[]
  todayDate: string
  todayScheduled: boolean
  todayDone: boolean
  todayTitle: string
  /** Any cardio/sport entry logged today (drives the post-session nudge). */
  cardioLoggedToday: boolean
  lastNotifiedAt: string | null
  /** An unlocked, unopened milestone review ('3mo' | '6mo' | '1yr'). */
  reviewReadyMark?: string | null
  reviewReadyLabel?: string
  /** The last mark we pushed a notification for, fires once per mark, ever. */
  reviewNotifiedMark?: string | null
  /** Today is the weekly check-in day and no measurement is logged yet. */
  checkinDueToday?: boolean
  checkinNotifiedDate?: string | null
  /** The Sergeant's 22:00 missed-day word, fires once per missed day. */
  missNotifiedDate?: string | null
  /** Rest day + a workout missed this week → the make-up push has a name. */
  makeupTitle?: string | null
  makeupNotifiedDate?: string | null
  /**
   * How many notifications have been SHOWN and not yet read. This is the
   * app-icon badge, and it may only ever be raised by actually delivering
   * one. Opening the app reads them all and sets it back to zero.
   */
  badgeCount?: number
}

export const MetaStore = {
  async get(): Promise<ReminderMeta | null> {
    const r = await withStore<ReminderMeta | undefined>(META_STORE, 'readonly', (s) => s.get('reminders'))
    return r ?? null
  },
  async set(meta: ReminderMeta): Promise<void> {
    await withStore(META_STORE, 'readwrite', (s) => s.put(meta, 'reminders'))
  },
}

export const PhotoStore = {
  async put(id: string, blob: Blob): Promise<void> {
    await withStore(STORE, 'readwrite', (s) => s.put(blob, id))
  },
  async get(id: string): Promise<Blob | null> {
    const r = await withStore<Blob | undefined>(STORE, 'readonly', (s) => s.get(id))
    return r ?? null
  },
  async delete(id: string): Promise<void> {
    await withStore(STORE, 'readwrite', (s) => s.delete(id))
  },
  async keys(): Promise<string[]> {
    const r = await withStore<IDBValidKey[]>(STORE, 'readonly', (s) => s.getAllKeys())
    return r.map(String)
  },
}

// ---------- Proof validation ----------

export const PROOF_MAX_AGE_DAYS = 7

export type ProofCheck =
  | { ok: true; ageDays: number }
  | { ok: false; reason: 'stale' | 'not-image'; ageDays: number }

/**
 * The mechanical proof check: the picked file must be an image created
 * within the last week (screenshots/photos carry their capture time in
 * `lastModified`). An old random photo is not evidence of THIS week's
 * conflict. Files with no timestamp get the benefit of the doubt.
 */
export function validateProofFile(file: { lastModified?: number; type?: string }): ProofCheck {
  if (file.type && !file.type.startsWith('image/')) {
    return { ok: false, reason: 'not-image', ageDays: 0 }
  }
  if (!file.lastModified) return { ok: true, ageDays: 0 }
  const ageDays = Math.floor((Date.now() - file.lastModified) / 86400000)
  if (ageDays > PROOF_MAX_AGE_DAYS) return { ok: false, reason: 'stale', ageDays }
  return { ok: true, ageDays: Math.max(0, ageDays) }
}

// ---------- Photo capture helpers (browser only) ----------

/** Downscale an image file to max 1280px JPEG q0.8, keeps year-scale storage sane. */
export async function downscalePhoto(file: Blob): Promise<{ blob: Blob; w: number; h: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    const MAX = 1280
    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.8),
    )
    return { blob, w, h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(b64: string, mime = 'image/jpeg'): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function storageUsage(): Promise<{ usedMB: number; quotaMB: number } | null> {
  try {
    const est = await navigator.storage.estimate()
    return {
      usedMB: Math.round(((est.usage ?? 0) / 1024 / 1024) * 10) / 10,
      quotaMB: Math.round((est.quota ?? 0) / 1024 / 1024),
    }
  } catch {
    return null
  }
}
