import { createClient } from 'npm:@supabase/supabase-js@2'

// Lost PIN → recovery code proves ownership, sets a new derived
// password, and rotates to a fresh one-time code. 5 wrong tries
// locks resets for an hour. Lost PIN + lost code = new account
// (local data is never at risk — the app works without any account).

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function makeRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(15))
  const c = [...bytes].map((b) => ALPHABET[b % ALPHABET.length])
  return `${c.slice(0, 5).join('')}-${c.slice(5, 10).join('')}-${c.slice(10, 15).join('')}`
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  let body: { phone?: string; recoveryCode?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Bad request.' })
  }

  const digits = String(body.phone ?? '').replace(/\D/g, '')
  const raw = String(body.recoveryCode ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const password = String(body.password ?? '')
  if (digits.length < 7 || digits.length > 15) return json(400, { error: 'Enter a real phone number.' })
  if (raw.length !== 15) return json(400, { error: 'That recovery code is not the right shape.' })
  if (!/^[0-9a-f]{64}$/.test(password)) return json(400, { error: 'Bad credential format.' })
  const code = `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`

  const { data: prof } = await admin.from('profiles').select('*').eq('phone', digits).maybeSingle()
  if (!prof) return json(404, { error: 'No account with that number.' })
  if (prof.reset_locked_until && new Date(prof.reset_locked_until) > new Date()) {
    return json(429, { error: 'Too many tries. Come back in an hour.' })
  }

  if ((await sha256Hex(code)) !== prof.recovery_hash) {
    const fails = (prof.reset_fails ?? 0) + 1
    await admin
      .from('profiles')
      .update(
        fails >= 5
          ? { reset_fails: 0, reset_locked_until: new Date(Date.now() + 3600_000).toISOString() }
          : { reset_fails: fails },
      )
      .eq('user_id', prof.user_id)
    return json(403, { error: 'Recovery code does not match.' })
  }

  const { error: uErr } = await admin.auth.admin.updateUserById(prof.user_id, { password })
  if (uErr) return json(500, { error: 'Could not reset. Try again.' })

  const newCode = makeRecoveryCode()
  await admin
    .from('profiles')
    .update({ recovery_hash: await sha256Hex(newCode), reset_fails: 0, reset_locked_until: null })
    .eq('user_id', prof.user_id)

  return json(200, { ok: true, recoveryCode: newCode })
})
