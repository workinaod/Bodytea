import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { daysBetween, formatShort } from '../../engine/calendar'
import { useToday } from '../../logic/clock'

import { fuelVideosFor, MOTIVATION_QUOTES } from '../../plan/messages'
import { GUIDE_SECTIONS } from '../../plan/guide'
import { EXERCISES } from '../../plan/exercises'
import { Btn, Card, Chip, ScreenHeader, SectionTitle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { coachLineFor } from '../../logic/actions'
import { avgMph, fmtDuration, fmtPace } from '../../engine/runs'
import { DebriefSheet } from '../today/DebriefSheet'
import { ExerciseGuideSheet } from '../today/ExerciseGuideSheet'
import { SettingsSheet } from './SettingsSheet'
import { DataTransferSheet } from './DataTransferSheet'
import { AccountSheet } from './AccountSheet'
import { BookletScreen } from '../booklet/BookletScreen'
import type { DebriefData } from '../../types'

/**
 * The feed used to print its internal situation id in a pill, so the
 * Sergeant announced himself with "protein-miss" and "tier-drop-planned".
 * Those are database keys, not headlines. Every one gets said in English.
 */
const FEED_LABELS: Record<string, string> = {
  'backup-nudge': 'Back it up',
  'chronic-fallback': 'A pattern',
  comeback: 'Comeback',
  contradiction: "Doesn't add up",
  'deload-start': 'Deload week',
  'explosive-day-warning': 'Heads up',
  lighten: 'Lighten it',
  'minimum-taken': 'Minimum taken',
  pr: 'Personal record',
  'protein-miss': 'Protein missed',
  'protein-streak': 'Protein streak',
  push: 'Need a push',
  'session-done': 'Session done',
  'skip-no-proof': 'Skipped',
  'skip-with-proof': 'Skipped, receipts in',
  streak: 'Streak',
  'tier-drop-midweek': 'Tier dropped',
  'tier-drop-planned': 'Tier planned down',
  'unexplained-miss': 'Missed day',
  'week-complete': 'Week complete',
}

function feedLabel(situation?: string): string {
  if (!situation) return 'Coach'
  return FEED_LABELS[situation] ?? situation.replace(/-/g, ' ')
}

export function CoachScreen() {
  const data = useAppStore((s) => s.data)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushLine, setPushLine] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [bookletOpen, setBookletOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [debrief, setDebrief] = useState<DebriefData | null>(null)
  const [guideExercise, setGuideExercise] = useState<string | null>(null)
  const [feedCount, setFeedCount] = useState(20)

  const today = useToday()
  const backupDays = data.settings.lastExportAt
    ? daysBetween(data.settings.lastExportAt.slice(0, 10), today)
    : null

  const quote = useMemo(
    () => MOTIVATION_QUOTES[daysBetween('2026-01-01', today) % MOTIVATION_QUOTES.length],
    [today],
  )

  // The record is a merged, factual timeline: coach feed + GPS runs/rides
  const record = useMemo(() => {
    const rows = [
      ...data.coach.feed.map((f) => ({ rowKind: 'feed' as const, at: f.at, f })),
      ...data.runs
        .filter((r) => r.distanceMi >= 0.05 && r.durationSec >= 120)
        .map((r) => ({ rowKind: 'run' as const, at: r.startedAt, r })),
    ]
    return rows.sort((a, b) => (a.at > b.at ? -1 : 1))
  }, [data.coach.feed, data.runs])

  return (
    <div className="space-y-3 pb-6">
      <ScreenHeader
        title="The Sergeant"
        right={
          <>
            <button aria-label="Settings" onClick={() => setSettingsOpen(true)} className="press flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-ink-dim">
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
              </svg>
            </button>
            <button aria-label="Account" onClick={() => setAccountOpen(true)} className="press flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-ink-dim">
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19a4.5 4.5 0 0 0 .36-8.99A6 6 0 0 0 6.2 8.6 5 5 0 0 0 7 18.9" />
                <path d="M12 13v8m0-8-3 3m3-3 3 3" />
              </svg>
            </button>
            <button aria-label="Data" onClick={() => setDataOpen(true)} className="press flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-ink-dim">
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v13m0 0-4-4m4 4 4-4" />
                <path d="M16 21V8m0 0 4 4m-4-4-4 4" />
              </svg>
            </button>
          </>
        }
      />

      {(backupDays === null || backupDays >= 7) && (
        <button onClick={() => setDataOpen(true)} className="w-full rounded-xl border border-gold/30 bg-gold/8 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-gold">
          {backupDays === null ? 'Never backed up. ' : `${backupDays} days since your last backup. `}
          It all lives on this phone. One tap fixes that →
        </button>
      )}

      {/* Need a push, typography, not a box */}
      <div className="px-2 pt-4 text-center">
        <p className="font-display text-[17px] font-semibold italic leading-snug text-ink">
          “{quote.text}”
        </p>
        {quote.source && (
          <p className="mt-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-faint">{quote.source}</p>
        )}
        <Btn
          className="mt-4 w-full"
          onClick={() => {
            // A pep talk on demand, spoken, not written into the Record
            setPushLine(coachLineFor('push', { goal: data.plan.goalStatement || 'getting better than yesterday' }))
            setPushOpen(true)
          }}
        >
          I'm feeling lazy, push me
        </Btn>
      </div>

      <Card onClick={() => setGuideOpen(true)} className="!p-4">
        <div className="text-[13.5px] font-extrabold">The Plan</div>
        <div className="mt-0.5 text-[11px] text-ink-faint">Rules, why it works, exercise library</div>
      </Card>

      <Card onClick={() => setBookletOpen(true)} className="!p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px] font-extrabold">My Booklet · {data.plan.name}</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">
              {data.plan.daysPerWeek} day{data.plan.daysPerWeek === 1 ? '' : 's'} a week · fine-tune everything
            </div>
          </div>
          <span className="text-[16px] text-ink-faint">›</span>
        </div>
      </Card>

      {/* The record: what actually happened, sessions, adjustments,
          runs/bikes. Pep talks live in the push sheet, not here. */}
      <SectionTitle>The record</SectionTitle>
      <div className="space-y-2">
        {record.slice(0, feedCount).map((row) => {
          if (row.rowKind === 'run') {
            const r = row.r
            return (
              <Card key={`run-${r.id}`} className="!py-3">
                <div className="flex items-center justify-between">
                  <Chip tone="cyan">{r.activity === 'bike' ? 'ride' : 'run'}</Chip>
                  <span className="text-[10px] font-semibold text-ink-faint">{formatShort(r.date)}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink">
                  {`${r.activity === 'bike' ? 'Ride' : 'Run'} · ${r.distanceMi.toFixed(2)} mi · ${fmtDuration(r.durationSec)} · ${fmtPace(r.avgPaceSec)} · ${avgMph(r.distanceMi, r.durationSec)} mph${(r.kcalEst ?? 0) > 0 ? ` · ~${r.kcalEst} cal` : ''}`}
                </p>
              </Card>
            )
          }
          const f = row.f
          const linkedClaim = f.excuseId
            ? data.excuses.find((e) => e.id === f.excuseId)?.claimText
            : undefined
          return (
            <Card key={f.id} className="!py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`eyebrow ${
                    f.kind === 'debrief' ? 'text-cyan' : f.kind === 'insight' ? 'text-lime' : 'text-accent-soft'
                  }`}
                >
                  {f.kind === 'debrief'
                    ? 'Debrief'
                    : f.kind === 'insight'
                      ? 'Insight'
                      : feedLabel(f.situation)}
                </span>
                <span className="text-[10px] font-semibold text-ink-faint">{formatShort(f.at.slice(0, 10))}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink">{f.text}</p>
              {linkedClaim && (
                <p className="mt-2 rounded-lg border-l-2 border-gold/50 bg-white/[0.07] px-3 py-2 text-[12.5px] italic leading-snug text-ink-dim">
                  Your words: "{linkedClaim}"
                </p>
              )}
              {f.debrief && (
                <button className="mt-1.5 text-[12px] font-semibold text-cyan underline" onClick={() => setDebrief(f.debrief!)}>
                  open debrief
                </button>
              )}
            </Card>
          )
        })}
        {record.length === 0 && (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">
            Nothing yet. Finish a session and the record starts.
          </p>
        )}
        {record.length > feedCount && (
          <Btn kind="ghost" className="w-full" onClick={() => setFeedCount((c) => c + 20)}>
            Older entries
          </Btn>
        )}
      </div>

      {/* Push sheet, the line IS the sheet; everything else is a footnote */}
      <Sheet open={pushOpen} onClose={() => setPushOpen(false)} title="Alright. Listen.">
        <div className="space-y-3 pb-6">
          <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-surface-2 to-surface px-5 pb-5 pt-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/14 blur-3xl" />
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
              The Sergeant · read it twice
            </div>
            <p className="mt-3 font-display text-[24px] font-bold leading-[1.18] tracking-tight text-ink">
              {pushLine}
            </p>
            {data.plan.goalStatement && (
              <div className="mt-4 border-l-2 border-accent/60 pl-3">
                <div className="text-[9.5px] font-black uppercase tracking-[0.18em] text-ink-faint">
                  What this is all for, in your words
                </div>
                <div className="mt-0.5 text-[13.5px] font-semibold italic text-accent-soft">
                  “{data.plan.goalStatement}”
                </div>
              </div>
            )}
          </div>
          <SectionTitle>Fuel (videos)</SectionTitle>
          <div className="space-y-2">
            {fuelVideosFor(data.plan.copyFlavor).map((v) => (
              <a
                key={v.title}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl bg-white/[0.07] px-3.5 py-3"
              >
                <div className="text-[13px] font-bold text-ink">▶ {v.title}</div>
                <div className="text-[11px] text-ink-faint">{v.note}</div>
              </a>
            ))}
          </div>
          <Btn kind="lime" className="w-full py-4 text-[15px]" onClick={() => setPushOpen(false)}>
            Fine. I'm going.
          </Btn>
        </div>
      </Sheet>

      {/* Guide sheet */}
      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="The Plan">
        <GuideReader onOpenExercise={(id) => setGuideExercise(id)} />
      </Sheet>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DataTransferSheet open={dataOpen} onClose={() => setDataOpen(false)} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
      {bookletOpen && <BookletScreen onClose={() => setBookletOpen(false)} />}
      <DebriefSheet debrief={debrief} onClose={() => setDebrief(null)} />
      <ExerciseGuideSheet exerciseId={guideExercise} onClose={() => setGuideExercise(null)} />
    </div>
  )
}

function GuideReader({ onOpenExercise }: { onOpenExercise: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [libOpen, setLibOpen] = useState(false)
  const groups = useMemo(() => {
    const byKind: Record<string, { id: string; name: string }[]> = {}
    for (const e of Object.values(EXERCISES)) {
      const k =
        e.kind === 'sprint' || e.kind === 'jump'
          ? 'Speed & jumps'
          : e.kind === 'lift' || e.kind === 'carry' || e.kind === 'core'
            ? 'Lifts & strength'
            : e.kind === 'mobility'
              ? 'Mobility'
              : 'Conditioning'
      ;(byKind[k] ??= []).push({ id: e.id, name: e.name })
    }
    return byKind
  }, [])

  return (
    <div className="space-y-2 pb-6">
      {GUIDE_SECTIONS.map((s) => (
        <div key={s.id} className="overflow-hidden rounded-xl bg-white/[0.05] ring-1 ring-white/[0.05]">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setOpen(open === s.id ? null : s.id)}
          >
            <span className="text-[13.5px] font-extrabold">{s.title}</span>
            <span className="text-ink-faint">{open === s.id ? '▾' : '▸'}</span>
          </button>
          {open === s.id && (
            <div className="space-y-2.5 border-t border-edge/60 px-4 py-3">
              {s.paragraphs.map((p, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-ink-dim">{p}</p>
              ))}
              {s.bullets && (
                <ul className="space-y-1.5">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-dim">
                      <span className="text-accent">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="overflow-hidden rounded-xl border border-cyan/25 bg-cyan/5">
        <button
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setLibOpen(!libOpen)}
        >
          <span className="text-[13.5px] font-extrabold text-cyan">Exercise library, every guide</span>
          <span className="text-ink-faint">{libOpen ? '▾' : '▸'}</span>
        </button>
        {libOpen && (
          <div className="space-y-3 border-t border-cyan/20 px-4 py-3">
            {Object.entries(groups).map(([group, list]) => (
              <div key={group}>
                <div className="mb-1 text-[10.5px] font-black uppercase tracking-wider text-ink-faint">{group}</div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((e) => (
                    <Chip key={e.id} onClick={() => onOpenExercise(e.id)}>{e.name}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
