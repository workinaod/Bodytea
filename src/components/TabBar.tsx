export type TabId = 'today' | 'week' | 'meals' | 'progress' | 'board' | 'coach'

const TABS: { id: TabId; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'today',
    label: 'Today',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" strokeLinejoin="round" fill={a ? 'var(--color-accent)' : 'none'} />
      </svg>
    ),
  },
  {
    id: 'week',
    label: 'Week',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        {a && <circle cx="12" cy="15" r="2" fill="var(--color-accent)" stroke="none" />}
      </svg>
    ),
  },
  {
    id: 'meals',
    label: 'Meals',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 3c-2 2-2.5 5-2.5 8H17v10" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M4 20V10M10 20V4M16 20v-6M21 20H3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'board',
    label: 'Board',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 20V9h6v11M3 20v-6h6v6M15 20v-9h6v9M2 20h20" />
        {a && <circle cx="12" cy="5" r="1.6" fill="var(--color-accent)" stroke="none" />}
      </svg>
    ),
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M8 3h8l2 4-6 3-6-3 2-4ZM12 10v4" strokeLinejoin="round" />
        <path d="M7 21a5 5 0 0 1 10 0" />
        <circle cx="12" cy="16" r="2.5" />
      </svg>
    ),
  },
]

export function TabBar({ tab, onChange, alert }: { tab: TabId; onChange: (t: TabId) => void; alert?: Partial<Record<TabId, boolean>> }) {
  return (
    <nav className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),10px)] z-40 mx-auto max-w-lg">
      <div className="flex items-stretch justify-around rounded-[22px] border border-edge/80 bg-surface/92 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex flex-1 flex-col items-center gap-px rounded-2xl py-1.5 transition-colors duration-200 ${
                active ? 'bg-accent/12 text-accent' : 'text-ink-faint active:text-ink-dim'
              }`}
            >
              {t.icon(active)}
              <span className={`text-[9.5px] font-bold ${active ? 'text-accent' : ''}`}>{t.label}</span>
              {alert?.[t.id] && (
                <span className="absolute right-[18%] top-1 h-2 w-2 rounded-full bg-danger shadow-[0_0_6px_rgba(255,77,94,0.8)]" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
