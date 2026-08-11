import { useEffect, useRef, useState } from 'react'

export type TabId = 'today' | 'week' | 'meals' | 'progress' | 'coach'

const ICONS: Record<TabId, (active: boolean) => JSX.Element> = {
  today: (a) => (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" strokeLinejoin="round" fill={a ? 'var(--color-accent)' : 'none'} />
    </svg>
  ),
  week: (a) => (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      {a && <circle cx="12" cy="15" r="2" fill="var(--color-accent)" stroke="none" />}
    </svg>
  ),
  meals: (a) => (
    // Fork and a real, closed-blade knife
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  ),
  progress: (a) => (
    // Bars climb left to right: progress goes UP
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M4 20v-5M10 20V9M16 20V4M21 20H3" strokeLinejoin="round" />
    </svg>
  ),
  coach: (a) => (
    // The Sergeant's whistle
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 9H20a1.5 1.5 0 0 1 1.5 1.5v1.2a1.5 1.5 0 0 1-1.1 1.45L15 14.4A5.5 5.5 0 1 1 9.5 9Z" />
      <circle cx="9.5" cy="14.5" r="1.6" fill={a ? 'var(--color-accent)' : 'none'} />
    </svg>
  ),
}

const LEFT: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
]
const RIGHT: { id: TabId; label: string }[] = [
  { id: 'meals', label: 'Meals' },
  { id: 'progress', label: 'Progress' },
  { id: 'coach', label: 'Coach' },
]

function TabButton({ id, label, active, onClick }: { id: TabId; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-px rounded-2xl py-1.5 transition-colors duration-200 ${
        active ? 'bg-accent/12 text-accent' : 'text-ink-faint active:text-ink-dim'
      }`}
    >
      {ICONS[id](active)}
      <span className={`text-[9.5px] font-bold ${active ? 'text-accent' : ''}`}>{label}</span>
    </button>
  )
}

/**
 * Five tabs around a raised center button: the GPS run/ride tracker
 * gets the Strava treatment, one thumb, straight into recording.
 *
 * While a session is live on the Today tab the whole bar folds into a
 * thin glowing strip at the screen's bottom edge, the session buttons
 * take its place. Tap or swipe the strip up and the real bar slides
 * back over the session row (and tucks away again after a tab pick or
 * a few seconds of quiet).
 */
export function TabBar({
  tab,
  onChange,
  onTrack,
  session = false,
}: {
  tab: TabId
  onChange: (t: TabId) => void
  onTrack: () => void
  session?: boolean
}) {
  const [peek, setPeek] = useState(false)
  const touchY = useRef<number | null>(null)

  useEffect(() => setPeek(false), [session, tab])
  useEffect(() => {
    if (!peek) return
    const id = window.setTimeout(() => setPeek(false), 6000)
    return () => window.clearTimeout(id)
  }, [peek])

  if (session && !peek) {
    return (
      <button
        aria-label="Show navigation"
        onClick={() => setPeek(true)}
        onTouchStart={(e) => {
          touchY.current = e.touches[0]?.clientY ?? null
        }}
        onTouchMove={(e) => {
          const y = e.touches[0]?.clientY
          if (touchY.current !== null && y !== undefined && touchY.current - y > 12) {
            touchY.current = null
            setPeek(true)
          }
        }}
        onTouchEnd={() => {
          touchY.current = null
        }}
        className="nav-glow fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),8px)] z-20 mx-auto h-[20px] max-w-lg rounded-full opacity-90 active:scale-x-[0.98]"
      >
        <span className="sr-only">Show navigation</span>
      </button>
    )
  }

  const pick = (t: TabId) => {
    if (session) setPeek(false)
    onChange(t)
  }

  return (
    <nav
      className={`fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-40 mx-auto max-w-lg ${session ? 'animate-rise' : ''}`}
      onTouchStart={(e) => {
        if (session) touchY.current = e.touches[0]?.clientY ?? null
      }}
      onTouchMove={(e) => {
        const y = e.touches[0]?.clientY
        if (session && touchY.current !== null && y !== undefined && y - touchY.current > 14) {
          touchY.current = null
          setPeek(false)
        }
      }}
      onTouchEnd={() => {
        touchY.current = null
      }}
    >
      <div className="relative flex items-stretch rounded-[22px] bg-[#131315]/90 ring-1 ring-white/[0.06] px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex flex-1 items-stretch">
          {LEFT.map((t) => (
            <TabButton key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={() => pick(t.id)} />
          ))}
        </div>

        {/* center slot: contained in the bar so it never shadows content taps */}
        <button
          aria-label="Track a run or ride"
          onClick={onTrack}
          className="flex w-14 shrink-0 flex-col items-center justify-center gap-px py-0.5 active:scale-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/60 bg-gradient-to-b from-accent to-accent-deep shadow-[0_4px_16px_-4px_rgba(255,79,48,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="black" stroke="black" strokeWidth="1" strokeLinejoin="round">
              <path d="M12 2.5 18.5 20 12 16.6 5.5 20Z" />
            </svg>
          </span>
          <span className="text-[9.5px] font-bold text-accent-soft">Track</span>
        </button>

        <div className="flex flex-1 items-stretch">
          {RIGHT.map((t) => (
            <TabButton key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={() => pick(t.id)} />
          ))}
        </div>
      </div>
    </nav>
  )
}
