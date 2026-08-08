export type TabId = 'today' | 'week' | 'meals' | 'progress' | 'coach'

const TABS: { id: TabId; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'today',
    label: 'Today',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" strokeLinejoin="round" fill={a ? 'var(--color-accent)' : 'none'} />
      </svg>
    ),
  },
  {
    id: 'week',
    label: 'Week',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
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
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 3c-2 2-2.5 5-2.5 8H17v10" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M4 20V10M10 20V4M16 20v-6M21 20H3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke={a ? 'var(--color-accent)' : 'currentColor'} strokeWidth="2" strokeLinecap="round">
        <path d="M8 3h8l2 4-6 3-6-3 2-4ZM12 10v4" strokeLinejoin="round" />
        <path d="M7 21a5 5 0 0 1 10 0" />
        <circle cx="12" cy="16" r="2.5" />
      </svg>
    ),
  },
]

export function TabBar({ tab, onChange, alert }: { tab: TabId; onChange: (t: TabId) => void; alert?: Partial<Record<TabId, boolean>> }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-bg/95 pb-[max(env(safe-area-inset-bottom),6px)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 ${active ? 'text-accent' : 'text-ink-faint'}`}
            >
              {t.icon(active)}
              <span className={`text-[10px] font-bold ${active ? 'text-accent' : ''}`}>{t.label}</span>
              {alert?.[t.id] && (
                <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-danger" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
