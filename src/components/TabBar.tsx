export type TabId = 'today' | 'week' | 'meals' | 'progress'

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
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 3c-2 2-2.5 5-2.5 8H17v10" />
    </svg>
  ),
  progress: (a) => (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
      <path d="M4 20V10M10 20V4M16 20v-6M21 20H3" strokeLinejoin="round" />
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
 * gets the Strava treatment — one thumb, straight into recording.
 */
export function TabBar({ tab, onChange, onTrack }: { tab: TabId; onChange: (t: TabId) => void; onTrack: () => void }) {
  return (
    <nav className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-40 mx-auto max-w-lg">
      <div className="relative flex items-stretch rounded-[22px] border border-edge/80 bg-surface/92 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <div className="flex flex-1 items-stretch">
          {LEFT.map((t) => (
            <TabButton key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={() => onChange(t.id)} />
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
            <TabButton key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={() => onChange(t.id)} />
          ))}
        </div>
      </div>
    </nav>
  )
}
