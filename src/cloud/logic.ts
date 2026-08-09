import type { AppData } from '../types'

// ============================================================
// Pure cloud logic: credential derivation, input validation,
// and the first-login adoption decision. No I/O — everything
// here is unit-testable and shared by sync.ts and the UI.
// ============================================================

export const SUPABASE_URL = 'https://elnvzitkfwzybkxcjytf.supabase.co'
// Publishable by design — RLS is the security boundary, not this key.
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbnZ6aXRrZnd6eWJreGNqeXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODk0NDcsImV4cCI6MjEwMTg2NTQ0N30.0WRwoX9dBRejN7OB4OcZUfvsXHsVkt0ebdjpjlnNnG4'

/** Envelope pushes above this size are refused (DB caps at 2 MB). */
export const ENVELOPE_MAX_BYTES = 2_000_000

// ---------- Input validation ----------

/** Strip to digits; a real number is 7–15 of them. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  return digits.length >= 7 && digits.length <= 15 ? digits : null
}

export function validUsername(u: string): boolean {
  return /^[a-z0-9_]{3,16}$/.test(u)
}

export function validPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}

// ---------- Credential derivation ----------

/**
 * The synthetic sign-in identity. GoTrue wants an email; we never send
 * mail to it (accounts are admin-created pre-confirmed).
 */
export function emailFor(digits: string): string {
  return `p${digits}@pin.bodytea.app`
}

/**
 * The password GoTrue stores is sha256("bodytea:v1:<digits>:<pin>") —
 * derived on-device so the raw PIN never leaves the phone. This formula
 * is FROZEN: changing it locks every existing account out.
 */
export async function derivePassword(digits: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`bodytea:v1:${digits}:${pin}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- First-login adoption ----------

/**
 * "Pristine" local data has nothing worth protecting: either onboarding
 * never finished, or it finished minutes ago with zero logged history.
 * Pulling a cloud backup over it loses nothing real.
 */
export function isPristine(data: AppData): boolean {
  if (!data.settings.onboarded) return true
  return Object.keys(data.sessions).length === 0 && Object.keys(data.meals).length === 0
}

export type AdoptionDecision = 'push' | 'pull' | 'conflict'

/**
 * What to do when a sign-in finds both a local and (maybe) a remote copy.
 * `metaLastRemoteExportedAt` is the envelope stamp this device last synced —
 * if the remote still carries it, no other device wrote since, so pushing
 * local is safe. Anything else with real data on both sides is a conflict
 * the user must settle.
 */
export function decideAdoption(args: {
  localPristine: boolean
  remoteExportedAt: string | null
  metaLastRemoteExportedAt: string | null
}): AdoptionDecision {
  if (!args.remoteExportedAt) return 'push'
  if (args.localPristine) return 'pull'
  if (args.metaLastRemoteExportedAt === args.remoteExportedAt) return 'push'
  return 'conflict'
}

// ---------- Sync meta (this device's sync bookmark) ----------

export const SYNC_META_KEY = 'bodytea.sync'

export interface SyncMeta {
  userId: string
  username: string
  phone: string
  /** exportedAt of the last envelope this device pushed or pulled. */
  lastRemoteExportedAt: string | null
  /** Wall-clock of the last successful sync, for the status line. */
  lastSyncAt: string | null
}

export function loadSyncMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    return raw ? (JSON.parse(raw) as SyncMeta) : null
  } catch {
    return null
  }
}

export function saveSyncMeta(meta: SyncMeta | null): void {
  try {
    if (meta) localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta))
    else localStorage.removeItem(SYNC_META_KEY)
  } catch {
    /* ignore */
  }
}
