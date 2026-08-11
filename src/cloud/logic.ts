import type { AppData } from '../types'

// ============================================================
// Pure cloud logic: credential derivation, input validation,
// and the first-login adoption decision. No I/O, everything
// here is unit-testable and shared by sync.ts and the UI.
// ============================================================

export const SUPABASE_URL = 'https://elnvzitkfwzybkxcjytf.supabase.co'
// Publishable by design. RLS is the security boundary, not this key.
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

/**
 * What a PIN may be when SIGNING IN. Deliberately permissive: accounts
 * created under the old 4-digit rule must still be able to get in.
 */
export function validPinForSignIn(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}

/**
 * What a PIN may be when it is being SET (register, or reset).
 *
 * This guards a complete health record, and the account identifier is a
 * phone number, which is guessable. Four digits is ten thousand tries;
 * six is a million, and refusing the obvious shapes removes the guesses
 * anyone would make first.
 */
export function validNewPin(pin: string): boolean {
  return /^\d{6,8}$/.test(pin) && !isTrivialPin(pin)
}

/** Runs, repeats and dates: the PINs an attacker tries before anything else. */
export function isTrivialPin(pin: string): boolean {
  if (/^(\d)\1*$/.test(pin)) return true // 000000, 111111
  const step = (a: string, b: string) => b.charCodeAt(0) - a.charCodeAt(0)
  const d = step(pin[0], pin[1])
  if ((d === 1 || d === -1) && [...pin].every((c, i) => i === 0 || step(pin[i - 1], c) === d)) {
    return true // 123456, 987654
  }
  // A repeated short block: 123123, 1212, 696969
  for (const size of [1, 2, 3]) {
    if (pin.length % size === 0 && pin.length / size > 1) {
      const head = pin.slice(0, size)
      if (pin.match(new RegExp(`.{${size}}`, 'g'))?.every((c) => c === head)) return true
    }
  }
  // Plausible birth years, the single most common 4-digit choice
  if (/^(19|20)\d{2}$/.test(pin)) return true
  return false
}

/** Why a PIN was refused, in the user's words. */
export function pinProblem(pin: string): string | null {
  if (!/^\d{6,8}$/.test(pin)) return 'PIN: 6 to 8 digits.'
  if (isTrivialPin(pin)) return 'Too easy to guess. Avoid runs, repeats and years.'
  return null
}

// ---------- Credential derivation ----------

/**
 * The synthetic sign-in identity. GoTrue wants an email; we never send
 * mail to it (accounts are admin-created pre-confirmed).
 */
export function emailFor(digits: string): string {
  return `p${digits}@pin.bodytea.app`
}

const hex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/**
 * v1: sha256("bodytea:v1:<digits>:<pin>"). One round, no salt, no
 * stretching, over an input with at most ten thousand possibilities.
 *
 * FROZEN, and kept only so existing accounts can still sign in. Nothing
 * new is ever created with it; `signIn` upgrades an account to v2 the
 * first time a v1 password works. Deleting this function locks out every
 * account that has not signed in since the upgrade shipped.
 */
export async function derivePasswordV1(digits: string, pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`bodytea:v1:${digits}:${pin}`)
  return hex(await crypto.subtle.digest('SHA-256', bytes))
}

/** Iteration count for v2. Raising this needs another version, not an edit. */
export const PBKDF2_ITERATIONS = 210_000

/**
 * v2: PBKDF2-SHA256, salted per account and stretched, so guessing a PIN
 * offline costs about two hundred thousand times what it did. The raw PIN
 * still never leaves the device; what crosses the wire is this digest.
 *
 * Also frozen once shipped. A v3 would be a new function plus another
 * step in the sign-in ladder.
 */
export async function derivePasswordV2(digits: string, pin: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      // Salted with the account it belongs to, so one rainbow table cannot
      // cover two users.
      salt: enc.encode(`bodytea:v2:${digits}`),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return hex(bits)
}

/** The derivation new accounts are created with. */
export const derivePassword = derivePasswordV2

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
 * `metaLastRemoteExportedAt` is the envelope stamp this device last synced,
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
