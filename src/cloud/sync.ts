import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Envelope } from '../types'
import { useAppStore } from '../store/appStore'
import { parseEnvelope, serializeState } from '../store/backup'
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  ENVELOPE_MAX_BYTES,
  decideAdoption,
  derivePassword,
  emailFor,
  isPristine,
  loadSyncMeta,
  saveSyncMeta,
  type SyncMeta,
} from './logic'

// ============================================================
// The cloud runtime: optional accounts (phone + PIN) with the
// whole envelope backed up to the user's own Supabase row.
// Local-first forever — every write lands in localStorage
// synchronously as before; the cloud push is a debounced echo.
// This module is only ever loaded via dynamic import, so
// local-only users never even parse it.
// ============================================================

let _client: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bodytea.auth' },
    })
  }
  return _client
}

// ---------- Status (tiny observable for the Account sheet) ----------

export type SyncStatus =
  | { kind: 'signed-out' }
  | { kind: 'idle'; lastSyncAt: string | null }
  | { kind: 'pending' }
  | { kind: 'offline'; lastSyncAt: string | null }
  | { kind: 'too-large' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; remote: { exportedAt: string; sessions: number } }

let status: SyncStatus = { kind: 'signed-out' }
const listeners = new Set<(s: SyncStatus) => void>()

function setStatus(s: SyncStatus) {
  status = s
  for (const l of listeners) l(s)
}
export function getStatus(): SyncStatus {
  return status
}
export function onStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export function getMeta(): SyncMeta | null {
  return loadSyncMeta()
}

// ---------- Envelope push / pull ----------

let conflictRemote: Envelope | null = null

async function pushNow(): Promise<void> {
  const session = (await supabase().auth.getSession()).data.session
  if (!session) return setStatus({ kind: 'signed-out' })
  const raw = serializeState(useAppStore.getState().data)
  if (raw.length > ENVELOPE_MAX_BYTES) return setStatus({ kind: 'too-large' })
  const envelope = JSON.parse(raw) as Envelope
  const { error } = await supabase()
    .from('states')
    .upsert({
      user_id: session.user.id,
      envelope,
      schema_version: envelope.schemaVersion,
      exported_at: envelope.exportedAt,
    })
  if (error) {
    setStatus(
      navigator.onLine === false
        ? { kind: 'offline', lastSyncAt: loadSyncMeta()?.lastSyncAt ?? null }
        : { kind: 'error', message: 'Backup failed — will retry.' },
    )
    return
  }
  const meta = loadSyncMeta()
  if (meta) {
    saveSyncMeta({ ...meta, lastRemoteExportedAt: envelope.exportedAt, lastSyncAt: new Date().toISOString() })
  }
  setStatus({ kind: 'idle', lastSyncAt: new Date().toISOString() })
  // Piggyback the leaderboard row on successful backups (interval-gated inside)
  void import('./board').then((m) => m.pushBoardStats()).catch(() => {})
}

async function fetchRemote(userId: string): Promise<Envelope | null> {
  const { data, error } = await supabase().from('states').select('envelope').eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Could not reach your backup.')
  return data ? (data.envelope as Envelope) : null
}

function adoptRemote(remote: Envelope): void {
  // Re-serialize through the normal import path: migrate + zod-validate.
  const parsed = parseEnvelope(JSON.stringify(remote))
  useAppStore.getState().replaceData(parsed.data)
  const meta = loadSyncMeta()
  if (meta) {
    saveSyncMeta({ ...meta, lastRemoteExportedAt: remote.exportedAt, lastSyncAt: new Date().toISOString() })
  }
}

/** First-login reconciliation between this device and the cloud row. */
async function runAdoption(userId: string): Promise<void> {
  const remote = await fetchRemote(userId)
  const decision = decideAdoption({
    localPristine: isPristine(useAppStore.getState().data),
    remoteExportedAt: remote?.exportedAt ?? null,
    metaLastRemoteExportedAt: loadSyncMeta()?.lastRemoteExportedAt ?? null,
  })
  if (decision === 'pull' && remote) {
    adoptRemote(remote)
    setStatus({ kind: 'idle', lastSyncAt: new Date().toISOString() })
  } else if (decision === 'push') {
    await pushNow()
  } else if (remote) {
    conflictRemote = remote
    setStatus({
      kind: 'conflict',
      remote: { exportedAt: remote.exportedAt, sessions: Object.keys(remote.data?.sessions ?? {}).length },
    })
  }
}

/** The user settled a conflict: keep this device's copy, or the cloud's. */
export async function resolveConflict(choice: 'device' | 'cloud'): Promise<void> {
  if (choice === 'cloud' && conflictRemote) {
    adoptRemote(conflictRemote)
    conflictRemote = null
    setStatus({ kind: 'idle', lastSyncAt: new Date().toISOString() })
    return
  }
  conflictRemote = null
  await pushNow()
}

// ---------- Auto-push (debounced echo of the local persist) ----------

const PUSH_DEBOUNCE_MS = 10_000
let pushTimer: ReturnType<typeof setTimeout> | null = null
let autoPushArmed = false

function armAutoPush(): void {
  if (autoPushArmed) return
  autoPushArmed = true
  useAppStore.subscribe(() => {
    if (status.kind === 'signed-out' || status.kind === 'conflict') return
    if (pushTimer) clearTimeout(pushTimer)
    setStatus({ kind: 'pending' })
    pushTimer = setTimeout(() => void pushNow(), PUSH_DEBOUNCE_MS)
  })
  window.addEventListener('online', () => {
    if (status.kind === 'offline' || status.kind === 'error') void pushNow()
  })
}

/** Flush a pending debounced push immediately (Account sheet's "Back up now"). */
export async function backUpNow(): Promise<void> {
  if (pushTimer) clearTimeout(pushTimer)
  await pushNow()
}

// ---------- Auth flows ----------

async function invokeAuthFn(
  name: string,
  body: Record<string, string>,
): Promise<{ ok?: boolean; recoveryCode?: string }> {
  const { data, error } = await supabase().functions.invoke(name, { body })
  if (error) {
    let message = 'Network problem — try again.'
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      try {
        const j = (await ctx.json()) as { error?: string }
        if (j?.error) message = j.error
      } catch {
        /* keep generic */
      }
    }
    throw new Error(message)
  }
  return (data ?? {}) as { ok?: boolean; recoveryCode?: string }
}

async function afterSignIn(digits: string): Promise<void> {
  const session = (await supabase().auth.getSession()).data.session
  if (!session) throw new Error('Sign-in did not stick — try again.')
  const { data: prof } = await supabase()
    .from('profiles')
    .select('username, phone')
    .eq('user_id', session.user.id)
    .maybeSingle()
  const existing = loadSyncMeta()
  saveSyncMeta({
    userId: session.user.id,
    username: prof?.username ?? existing?.username ?? '',
    phone: prof?.phone ?? digits,
    lastRemoteExportedAt:
      existing && existing.userId === session.user.id ? existing.lastRemoteExportedAt : null,
    lastSyncAt: existing && existing.userId === session.user.id ? existing.lastSyncAt : null,
  })
  armAutoPush()
  await runAdoption(session.user.id)
}

export async function registerAccount(args: {
  phone: string
  username: string
  pin: string
}): Promise<{ recoveryCode: string }> {
  const password = await derivePassword(args.phone, args.pin)
  const res = await invokeAuthFn('auth-register', {
    phone: args.phone,
    username: args.username,
    password,
  })
  if (!res.recoveryCode) throw new Error('Registration failed — try again.')
  const { error } = await supabase().auth.signInWithPassword({ email: emailFor(args.phone), password })
  if (error) throw new Error('Account created but sign-in failed — use Sign in.')
  await afterSignIn(args.phone)
  return { recoveryCode: res.recoveryCode }
}

export async function signIn(args: { phone: string; pin: string }): Promise<void> {
  const password = await derivePassword(args.phone, args.pin)
  const { error } = await supabase().auth.signInWithPassword({ email: emailFor(args.phone), password })
  if (error) throw new Error('Wrong number or PIN.')
  await afterSignIn(args.phone)
}

export async function resetPin(args: {
  phone: string
  recoveryCode: string
  newPin: string
}): Promise<{ recoveryCode: string }> {
  const password = await derivePassword(args.phone, args.newPin)
  const res = await invokeAuthFn('auth-reset-pin', {
    phone: args.phone,
    recoveryCode: args.recoveryCode,
    password,
  })
  if (!res.recoveryCode) throw new Error('Reset failed — try again.')
  const { error } = await supabase().auth.signInWithPassword({ email: emailFor(args.phone), password })
  if (error) throw new Error('PIN reset but sign-in failed — use Sign in.')
  await afterSignIn(args.phone)
  return { recoveryCode: res.recoveryCode }
}

/** Sign out of the cloud. Local data stays on the device untouched. */
export async function signOut(): Promise<void> {
  await supabase().auth.signOut()
  saveSyncMeta(null)
  conflictRemote = null
  setStatus({ kind: 'signed-out' })
}

// ---------- Boot ----------

/** Restore a persisted session (called once at app start when meta exists). */
export async function initCloudSync(): Promise<void> {
  const session = (await supabase().auth.getSession()).data.session
  if (!session) {
    setStatus({ kind: 'signed-out' })
    return
  }
  armAutoPush()
  setStatus({ kind: 'idle', lastSyncAt: loadSyncMeta()?.lastSyncAt ?? null })
  try {
    await runAdoption(session.user.id)
  } catch {
    setStatus(
      navigator.onLine === false
        ? { kind: 'offline', lastSyncAt: loadSyncMeta()?.lastSyncAt ?? null }
        : { kind: 'error', message: 'Could not reach your backup.' },
    )
  }
}
