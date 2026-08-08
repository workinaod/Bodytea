// ============================================================
// Storage drivers. App state lives in localStorage as a single
// versioned Envelope; photo blobs live in IndexedDB. The driver
// interface exists so a cloud adapter can slot in later without
// touching the rest of the app.
// ============================================================

export interface StorageDriver {
  load(): string | null
  save(raw: string): void
}

export const STATE_KEY = 'naod.state'

export class LocalStorageDriver implements StorageDriver {
  load(): string | null {
    try {
      return localStorage.getItem(STATE_KEY)
    } catch {
      return null
    }
  }
  save(raw: string): void {
    try {
      localStorage.setItem(STATE_KEY, raw)
    } catch (e) {
      console.error('Failed to persist state', e)
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
  lastNotifiedAt: string | null
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

// ---------- Photo capture helpers (browser only) ----------

/** Downscale an image file to max 1280px JPEG q0.8 — keeps year-scale storage sane. */
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
