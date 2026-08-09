import { createClient } from 'npm:@supabase/supabase-js@2'

// Phone + PIN accounts without SMS: the client derives a password
// (sha256 of phone:pin, never the raw PIN) and we admin-create a
// pre-confirmed user under a synthetic email. Returns a one-time
// recovery code — the only way back in if the PIN is lost.

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

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L
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

  let body: { phone?: string; username?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Bad request.' })
  }

  const digits = String(body.phone ?? '').replace(/\D/g, '')
  const username = String(body.username ?? '').toLowerCase().trim()
  const password = String(body.password ?? '')
  if (digits.length < 7 || digits.length > 15) return json(400, { error: 'Enter a real phone number.' })
  if (!/^[a-z0-9_]{3,16}$/.test(username)) return json(400, { error: 'Username: 3–16 letters, numbers, or underscores.' })
  if (!/^[0-9a-f]{64}$/.test(password)) return json(400, { error: 'Bad credential format.' })

  const { data: taken } = await admin
    .from('profiles')
    .select('phone, username')
    .or(`phone.eq.${digits},username.eq.${username}`)
  if (taken?.some((t) => t.phone === digits)) return json(409, { error: 'That number already has an account — sign in instead.' })
  if (taken?.some((t) => t.username === username)) return json(409, { error: 'That username is taken.' })

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: `p${digits}@pin.bodytea.app`,
    password,
    email_confirm: true,
    user_metadata: { username },
  })
  if (cErr || !created?.user) return json(500, { error: 'Could not create the account. Try again.' })

  const code = makeRecoveryCode()
  const { error: pErr } = await admin.from('profiles').insert({
    user_id: created.user.id,
    phone: digits,
    username,
    recovery_hash: await sha256Hex(code),
  })
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json(409, { error: 'That number or username is already registered.' })
  }

  return json(200, { ok: true, recoveryCode: code })
})
