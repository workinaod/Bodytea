import { supabase } from './sync'
import { loadSyncMeta } from './logic'
import { useAppStore } from '../store/appStore'
import { computeBoardStats } from '../engine/board'

// ============================================================
// Global leaderboard I/O. Push is best-effort and interval-gated;
// reads carry a 5-minute memory cache plus a localStorage copy so
// the board still renders offline. Ranks only accounts with ≥3
// sessions that synced within 45 days, no ghost rows.
// ============================================================

export interface BoardRow {
  user_id: string
  username: string
  goal: string
  goal_statement: string
  streak: number
  consistency30: number
  pr_gain90: number
  protein30: number
  sessions_total: number
  updated_at: string
}

export type BoardCategory = 'streak' | 'consistency30' | 'pr_gain90' | 'protein30' | 'sessions_total'

const PUSHED_AT_KEY = 'bodytea.board.pushedAt'
const PUSH_MIN_INTERVAL_MS = 3600_000

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Upsert my current stats. No-op when signed out or pushed within the hour. */
export async function pushBoardStats(force = false): Promise<void> {
  try {
    const session = (await supabase().auth.getSession()).data.session
    if (!session) return
    const last = Number(localStorage.getItem(PUSHED_AT_KEY) ?? 0)
    if (!force && Date.now() - last < PUSH_MIN_INTERVAL_MS) return
    const data = useAppStore.getState().data
    const s = computeBoardStats(data)
    const { error } = await supabase()
      .from('board_stats')
      .upsert({
        user_id: session.user.id,
        username: loadSyncMeta()?.username || 'athlete',
        goal: data.plan.goal,
        goal_statement: data.plan.goalStatement.slice(0, 80),
        streak: clamp(Math.round(s.streak), 0, 5000),
        consistency30: clamp(s.consistency30 ?? 0, 0, 100),
        pr_gain90: clamp(s.prGain90 ?? 0, -100, 500),
        protein30: clamp(s.protein30 ?? 0, 0, 100),
        sessions_total: clamp(s.sessionsTotal, 0, 100000),
      })
    if (!error) localStorage.setItem(PUSHED_AT_KEY, String(Date.now()))
  } catch {
    /* board pushes never block anything */
  }
}

const CACHE_KEY = 'bodytea.board.cache'
const CACHE_TTL_MS = 300_000
const memCache = new Map<BoardCategory, { at: number; rows: BoardRow[] }>()

/** Top 50 for a category. Falls back to the last cached board offline. */
export async function fetchBoard(category: BoardCategory): Promise<{ rows: BoardRow[]; fromCache: boolean }> {
  const cached = memCache.get(category)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return { rows: cached.rows, fromCache: false }
  try {
    const since = new Date(Date.now() - 45 * 86400_000).toISOString()
    const { data, error } = await supabase()
      .from('board_stats')
      .select('*')
      .gte('sessions_total', 3)
      .gte('updated_at', since)
      .order(category, { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(50)
    if (error) throw error
    const rows = (data ?? []) as BoardRow[]
    memCache.set(category, { at: Date.now(), rows })
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }))
    } catch {
      /* cache is optional */
    }
    return { rows, fromCache: false }
  } catch {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) return { rows: (JSON.parse(raw) as { rows: BoardRow[] }).rows, fromCache: true }
    } catch {
      /* fall through */
    }
    return { rows: [], fromCache: true }
  }
}

export async function myUserId(): Promise<string | null> {
  try {
    return (await supabase().auth.getSession()).data.session?.user.id ?? null
  } catch {
    return null
  }
}
