import { useEffect, useRef, useState } from 'react'
import { Btn } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { normalizePhone, validPin, validUsername, type SyncMeta } from '../../cloud/logic'
import type * as CloudModule from '../../cloud/sync'
import type { SyncStatus } from '../../cloud/sync'

type Cloud = typeof CloudModule

// ============================================================
// Optional account: phone + PIN, no SMS, no email. The app is
// 100% usable without one — an account adds cloud backup and
// the leaderboard. Loaded lazily so local-only users never
// even download the cloud code path's runtime.
// ============================================================

type View = 'menu' | 'register' | 'signin' | 'reset' | 'code' | 'status'

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cloud, setCloud] = useState<Cloud | null>(null)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [meta, setMeta] = useState<SyncMeta | null>(null)
  const [view, setView] = useState<View>('menu')

  const [phone, setPhone] = useState('')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [recovery, setRecovery] = useState('')
  const [issuedCode, setIssuedCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const unsubRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void import('../../cloud/sync').then(async (m) => {
      if (cancelled) return
      setCloud(m)
      if (m.getStatus().kind === 'signed-out') await m.initCloudSync().catch(() => {})
      if (cancelled) return
      setStatus(m.getStatus())
      setMeta(m.getMeta())
      setView(m.getStatus().kind === 'signed-out' ? 'menu' : 'status')
      unsubRef.current = m.onStatus((s) => {
        setStatus(s)
        setMeta(m.getMeta())
      })
    })
    return () => {
      cancelled = true
      unsubRef.current()
    }
  }, [open])

  const run = (fn: () => Promise<void>) => {
    setError('')
    setBusy(true)
    fn()
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Something went wrong.'))
      .finally(() => setBusy(false))
  }

  const digits = normalizePhone(phone)
  const uname = username.toLowerCase().trim()

  const submitRegister = () =>
    run(async () => {
      if (!cloud || !digits) throw new Error('Enter a real phone number.')
      if (!validUsername(uname)) throw new Error('Username: 3–16 lowercase letters, numbers, or underscores.')
      if (!validPin(pin)) throw new Error('PIN: 4–8 digits.')
      if (pin !== pin2) throw new Error('PINs do not match.')
      const { recoveryCode } = await cloud.registerAccount({ phone: digits, username: uname, pin })
      setIssuedCode(recoveryCode)
      setView('code')
    })

  const submitSignIn = () =>
    run(async () => {
      if (!cloud || !digits) throw new Error('Enter a real phone number.')
      if (!validPin(pin)) throw new Error('PIN: 4–8 digits.')
      await cloud.signIn({ phone: digits, pin })
      setView('status')
    })

  const submitReset = () =>
    run(async () => {
      if (!cloud || !digits) throw new Error('Enter a real phone number.')
      if (!validPin(pin)) throw new Error('New PIN: 4–8 digits.')
      if (pin !== pin2) throw new Error('PINs do not match.')
      const { recoveryCode } = await cloud.resetPin({ phone: digits, recoveryCode: recovery, newPin: pin })
      setIssuedCode(recoveryCode)
      setView('code')
    })

  const field =
    'w-full rounded-xl border border-edge bg-surface px-4 py-3 text-[15px] font-semibold text-ink outline-none focus:border-accent/60'

  return (
    <Sheet open={open} onClose={onClose} title="Account & backup">
      <div className="space-y-4 pb-8">
        {!cloud && <p className="py-8 text-center text-[13px] text-ink-faint">Loading…</p>}

        {cloud && view === 'menu' && (
          <>
            <p className="text-[13px] leading-relaxed text-ink-dim">
              Optional, everything works without one. An account adds a <b className="text-ink">cloud backup</b> of
              your booklet + history and puts you on the <b className="text-ink">leaderboard</b>. Sign-in is your
              number + a PIN. No SMS, no email, nothing to verify.
            </p>
            <Btn className="w-full py-3.5" onClick={() => { setError(''); setView('register') }}>
              Create my account
            </Btn>
            <Btn kind="subtle" className="w-full py-3.5" onClick={() => { setError(''); setView('signin') }}>
              I have one — sign in
            </Btn>
          </>
        )}

        {cloud && (view === 'register' || view === 'signin' || view === 'reset') && (
          <>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              inputMode="tel"
              autoComplete="tel"
              className={field}
            />
            {view === 'register' && (
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (shows on the leaderboard)"
                autoCapitalize="none"
                className={field}
              />
            )}
            {view === 'reset' && (
              <input
                value={recovery}
                onChange={(e) => setRecovery(e.target.value)}
                placeholder="Recovery code (XXXXX-XXXXX-XXXXX)"
                autoCapitalize="characters"
                className={field}
              />
            )}
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder={view === 'reset' ? 'New PIN (4–8 digits)' : 'PIN (4–8 digits)'}
              inputMode="numeric"
              type="password"
              className={field}
            />
            {view !== 'signin' && (
              <input
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
                placeholder="PIN again"
                inputMode="numeric"
                type="password"
                className={field}
              />
            )}
            {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
            <Btn
              className="w-full py-3.5"
              disabled={busy}
              onClick={view === 'register' ? submitRegister : view === 'signin' ? submitSignIn : submitReset}
            >
              {busy ? 'Working…' : view === 'register' ? 'Create account' : view === 'signin' ? 'Sign in' : 'Reset PIN'}
            </Btn>
            {view === 'signin' && (
              <button onClick={() => { setError(''); setView('reset') }} className="w-full text-center text-[12px] font-semibold text-ink-faint underline">
                Forgot my PIN, I have my recovery code
              </button>
            )}
            <button onClick={() => { setError(''); setView('menu') }} className="w-full text-center text-[12px] font-semibold text-ink-faint underline">
              back
            </button>
          </>
        )}

        {cloud && view === 'code' && (
          <>
            <p className="text-[13px] font-bold text-gold">Screenshot this. Right now.</p>
            <div className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-5 text-center">
              <div className="font-mono text-[20px] font-black tracking-wider text-gold">{issuedCode}</div>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-dim">
              This recovery code is the <b className="text-ink">only</b> way back in if you forget your PIN. We can't
              text you, we can't email you. Lose both and the account is gone for good (your data on this phone stays
              safe either way).
            </p>
            <Btn
              kind="subtle"
              className="w-full py-3"
              onClick={() => void navigator.clipboard?.writeText(issuedCode).catch(() => {})}
            >
              Copy it
            </Btn>
            <Btn className="w-full py-3.5" onClick={() => setView('status')}>
              Saved it, done
            </Btn>
          </>
        )}

        {cloud && view === 'status' && status && (
          <>
            <div className="rounded-2xl border border-edge bg-surface p-4">
              <div className="text-[16px] font-black">@{meta?.username || 'you'}</div>
              <div className="mt-0.5 text-[12px] text-ink-faint">{meta?.phone ? `···${meta.phone.slice(-4)}` : ''}</div>
              <div className="mt-3 text-[13px] font-semibold">
                {status.kind === 'idle' && <span className="text-lime">✓ Backed up {ago(status.lastSyncAt)}</span>}
                {status.kind === 'pending' && <span className="text-cyan">Backing up…</span>}
                {status.kind === 'offline' && <span className="text-gold">Offline. Will back up when you're back</span>}
                {status.kind === 'too-large' && <span className="text-danger">Backup too large to upload</span>}
                {status.kind === 'error' && <span className="text-danger">{status.message}</span>}
                {status.kind === 'conflict' && <span className="text-gold">Two copies found, pick one below</span>}
                {status.kind === 'signed-out' && <span className="text-ink-faint">Signed out</span>}
              </div>
            </div>

            {status.kind === 'conflict' && (
              <div className="space-y-2 rounded-2xl border border-gold/40 bg-gold/8 p-4">
                <p className="text-[12.5px] leading-relaxed text-ink-dim">
                  Your cloud backup ({status.remote.sessions} logged session{status.remote.sessions === 1 ? '' : 's'},
                  saved {ago(status.remote.exportedAt)}) differs from what's on this phone. Which one is the real you?
                </p>
                <Btn className="w-full py-3" disabled={busy} onClick={() => run(() => cloud.resolveConflict('device'))}>
                  Keep this phone, overwrite cloud
                </Btn>
                <Btn kind="subtle" className="w-full py-3" disabled={busy} onClick={() => run(() => cloud.resolveConflict('cloud'))}>
                  Use the cloud backup, replace this phone
                </Btn>
              </div>
            )}

            {status.kind !== 'conflict' && (
              <Btn className="w-full py-3.5" disabled={busy} onClick={() => run(() => cloud.backUpNow())}>
                Back up now
              </Btn>
            )}
            {error && <p className="text-[12.5px] font-semibold text-danger">{error}</p>}
            <Btn
              kind="ghost"
              className="w-full py-3"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await cloud.signOut()
                  setView('menu')
                })
              }
            >
              Sign out (data stays on this phone)
            </Btn>
          </>
        )}
      </div>
    </Sheet>
  )
}

function ago(iso: string | null): string {
  if (!iso) return 'just now'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}
