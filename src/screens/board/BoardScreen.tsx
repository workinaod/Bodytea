import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { computeBoardStats } from '../../engine/board'
import type { BoardCategory, BoardRow } from '../../cloud/board'
import { Btn, Chip } from '../../components/ui'
import { AccountSheet } from '../coach/AccountSheet'

// ============================================================
// The Board — global leaderboard, now a subtab of Progress.
// Your own numbers always render (computed locally, even offline
// or signed out); the ranked lists come from board_stats and are
// cached for 5 minutes / kept for offline viewing.
// ============================================================

const CATEGORIES: { id: BoardCategory; label: string; blurb: string }[] = [
  { id: 'streak', label: 'Streak', blurb: 'Consecutive scheduled days honored' },
  { id: 'consistency30', label: 'Consistency', blurb: 'Scheduled days honored, last 30' },
  { id: 'pr_gain90', label: 'PR gains', blurb: 'Strength climbed, last 90 days' },
  { id: 'protein30', label: 'Meal prep', blurb: 'Protein target hit, last 30' },
  { id: 'sessions_total', label: 'Sessions', blurb: 'Total sessions, all time' },
]

function fmtValue(category: BoardCategory, v: number): string {
  if (category === 'streak') return `${Math.round(v)}d`
  if (category === 'sessions_total') return `${Math.round(v)}`
  if (category === 'pr_gain90') return `${v > 0 ? '+' : ''}${v}%`
  return `${v}%`
}

type CloudBoard = typeof import('../../cloud/board')

export function BoardContent() {
  const data = useAppStore((s) => s.data)
  const [board, setBoard] = useState<CloudBoard | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  const [category, setCategory] = useState<BoardCategory>('streak')
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)

  const mine = useMemo(() => computeBoardStats(data), [data])

  // Load the cloud chunk + session once; re-check when the account sheet closes.
  useEffect(() => {
    if (accountOpen) return
    let cancelled = false
    void (async () => {
      const sync = await import('../../cloud/sync')
      const b = await import('../../cloud/board')
      if (sync.getStatus().kind === 'signed-out') await sync.initCloudSync().catch(() => {})
      const id = await b.myUserId()
      if (cancelled) return
      setBoard(b)
      setUid(id)
      setChecked(true)
      if (id) void b.pushBoardStats() // make sure I'm on the board I'm about to read
    })()
    return () => {
      cancelled = true
    }
  }, [accountOpen])

  // Fetch the ranked list whenever signed in + category changes.
  useEffect(() => {
    if (!board || !uid) return
    let cancelled = false
    setRows(null)
    void board.fetchBoard(category).then(({ rows, fromCache }) => {
      if (cancelled) return
      setRows(rows)
      setFromCache(fromCache)
    })
    return () => {
      cancelled = true
    }
  }, [board, uid, category])

  const cat = CATEGORIES.find((c) => c.id === category)!
  const myRow = rows?.find((r) => r.user_id === uid)
  const myRank = myRow && rows ? rows.indexOf(myRow) + 1 : null
  const myLocalValue =
    category === 'streak'
      ? mine.streak
      : category === 'consistency30'
        ? mine.consistency30
        : category === 'pr_gain90'
          ? mine.prGain90
          : category === 'protein30'
            ? mine.protein30
            : mine.sessionsTotal

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-ink-faint">Global. Every athlete on the app, one ladder.</p>

      {/* Your numbers always render, account or not */}
      <div className="rounded-2xl border border-edge/80 bg-surface p-3.5">
        <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-ink-faint">Your numbers</div>
        <div className="grid grid-cols-5 gap-1 text-center">
          <MiniStat label="Streak" value={`${mine.streak}d`} hot={mine.streak >= 7} />
          <MiniStat label="Consist." value={mine.consistency30 === null ? '—' : `${Math.round(mine.consistency30)}%`} />
          <MiniStat label="PRs" value={mine.prGain90 === null ? '—' : `${mine.prGain90 > 0 ? '+' : ''}${Math.round(mine.prGain90)}%`} />
          <MiniStat label="Protein" value={mine.protein30 === null ? '—' : `${Math.round(mine.protein30)}%`} />
          <MiniStat label="Total" value={`${mine.sessionsTotal}`} />
        </div>
        {(mine.consistency30 === null || mine.protein30 === null || mine.prGain90 === null) && (
          <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
            “—” means not enough data yet. Keep logging, the numbers rank themselves.
          </p>
        )}
      </div>

      {checked && !uid && (
        <div className="rounded-2xl border border-accent/30 bg-surface p-4">
          <p className="text-[13px] leading-relaxed text-ink-dim">
            The board is where your streak meets everyone else's. Create a free account (number + PIN, no SMS) and
            your numbers start competing.
          </p>
          <Btn className="mt-3 w-full py-3" onClick={() => setAccountOpen(true)}>
            Put me on the board
          </Btn>
        </div>
      )}

      {uid && (
        <>
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-1.5">
              {CATEGORIES.map((c) => (
                <Chip key={c.id} tone={category === c.id ? 'accent' : 'default'} onClick={() => setCategory(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-ink-faint">
            {cat.blurb}
            {fromCache ? ' · showing cached board (offline)' : ''}
          </p>

          {rows === null && <p className="py-8 text-center text-[12.5px] text-ink-faint">Loading the ladder…</p>}

          {rows !== null && rows.length === 0 && (
            <div className="rounded-2xl border border-edge/80 bg-surface py-6 text-center">
              <p className="text-[13px] font-bold">Nobody's ranked yet.</p>
              <p className="mt-1 text-[12px] text-ink-dim">
                Ranking takes 3 logged sessions. Log yours and take the top spot while it's free.
              </p>
            </div>
          )}

          {rows !== null && rows.length > 0 && (
            <>
              {/* Podium */}
              <div className="grid grid-cols-3 items-end gap-2">
                {[rows[1], rows[0], rows[2]].map((r, i) =>
                  r ? (
                    <PodiumTile
                      key={r.user_id}
                      row={r}
                      rank={i === 1 ? 1 : i === 0 ? 2 : 3}
                      category={category}
                      me={r.user_id === uid}
                    />
                  ) : (
                    <div key={`empty-${i}`} />
                  ),
                )}
              </div>

              {/* 4..50 — one ladder, not fifty boxes */}
              <div className="overflow-hidden rounded-2xl border border-edge/80 bg-surface">
                {rows.slice(3).map((r, i) => (
                  <div
                    key={r.user_id}
                    className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-edge/50' : ''} ${
                      r.user_id === uid ? 'bg-accent/10' : ''
                    }`}
                  >
                    <span className="w-7 shrink-0 font-mono text-[12px] font-bold text-ink-faint">{i + 4}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-[13.5px] font-bold ${r.user_id === uid ? 'text-accent-soft' : ''}`}>
                        @{r.username}
                        {r.user_id === uid ? ' — you' : ''}
                      </div>
                      {r.streak >= 7 && (
                        <div className="text-[10.5px] text-ink-faint">{r.streak}-day streak</div>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-[14px] font-black text-ink">
                      {fmtValue(category, Number(r[category]))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Me, when outside the top 50 */}
              {!myRow && (
                <div className="flex items-center gap-3 rounded-2xl border border-accent/50 bg-accent/10 px-4 py-2.5">
                  <span className="w-7 shrink-0 font-mono text-[12px] font-bold text-ink-faint">—</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold">You: outside the top 50 (for now)</div>
                    <div className="text-[10.5px] text-ink-faint">Every logged day moves this number.</div>
                  </div>
                  <span className="shrink-0 font-mono text-[14px] font-black text-accent">
                    {myLocalValue === null ? '—' : fmtValue(category, myLocalValue)}
                  </span>
                </div>
              )}
              {myRank !== null && myRank <= 3 && (
                <p className="text-center text-[12px] font-bold text-gold">You're on the podium. Defend it.</p>
              )}
            </>
          )}
        </>
      )}

      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  )
}

function MiniStat({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div>
      <div className={`text-[15px] font-black ${hot ? 'text-accent' : 'text-ink'}`}>{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wide text-ink-faint">{label}</div>
    </div>
  )
}

function PodiumTile({ row, rank, category, me }: { row: BoardRow; rank: 1 | 2 | 3; category: BoardCategory; me: boolean }) {
  const heights = { 1: 'pt-5 pb-4', 2: 'pt-3 pb-3', 3: 'pt-2 pb-2.5' }
  const rankTone = { 1: 'text-gold', 2: 'text-ink', 3: 'text-ink-dim' }
  return (
    <div
      style={{ animationDelay: `${rank * 60}ms` }}
      className={`animate-rise rounded-2xl border text-center ${heights[rank]} ${
        me ? 'border-accent/60 bg-accent/15' : rank === 1 ? 'border-gold/40 bg-surface' : 'border-edge bg-surface'
      }`}
    >
      <div className={`font-display text-[17px] font-bold leading-none ${rankTone[rank]}`}>{rank}</div>
      <div className="mt-1 truncate px-2 text-[12.5px] font-black">@{row.username}</div>
      <div className="mt-0.5 font-mono text-[14px] font-black text-accent">{fmtValue(category, Number(row[category]))}</div>
      {row.streak >= 7 && <div className="mt-0.5 text-[10px] text-ink-faint">{row.streak}-day streak</div>}
    </div>
  )
}
