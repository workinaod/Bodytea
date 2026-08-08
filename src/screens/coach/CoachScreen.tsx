import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { daysBetween, formatShort } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { unprovenExcusesInWindow } from '../../engine/coach'
import { MOTIVATION_QUOTES, MOTIVATION_VIDEOS } from '../../plan/messages'
import { GUIDE_SECTIONS } from '../../plan/guide'
import { EXERCISES } from '../../plan/exercises'
import { Btn, Card, Chip, SectionTitle } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { pushCoachMessage } from '../../logic/actions'
import { DebriefSheet } from '../today/DebriefSheet'
import { ExerciseGuideSheet } from '../today/ExerciseGuideSheet'
import { SettingsSheet } from './SettingsSheet'
import { DataTransferSheet } from './DataTransferSheet'
import { ExcuseLedger } from './ExcuseLedger'
import type { DebriefData } from '../../types'

export function CoachScreen() {
  const data = useAppStore((s) => s.data)
  const [pushOpen, setPushOpen] = useState(false)
  const [pushLine, setPushLine] = useState('')
  const [ledgerOpen, setLedgerOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [debrief, setDebrief] = useState<DebriefData | null>(null)
  const [guideExercise, setGuideExercise] = useState<string | null>(null)
  const [feedCount, setFeedCount] = useState(20)

  const today = useToday()
  const unproven = unprovenExcusesInWindow(data.excuses, today).length
  const backupDays = data.settings.lastExportAt
    ? daysBetween(data.settings.lastExportAt.slice(0, 10), today)
    : null

  const quote = useMemo(
    () => MOTIVATION_QUOTES[daysBetween('2026-01-01', today) % MOTIVATION_QUOTES.length],
    [today],
  )

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-black tracking-tight">The Sergeant</h1>
        <div className="flex gap-1.5">
          <button onClick={() => setSettingsOpen(true)} className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] font-bold text-ink-dim">
            ⚙︎
          </button>
          <button onClick={() => setDataOpen(true)} className="rounded-xl bg-surface-2 px-3 py-2 text-[12px] font-bold text-ink-dim">
            ⇅ data
          </button>
        </div>
      </div>

      {(backupDays === null || backupDays >= 7) && (
        <button onClick={() => setDataOpen(true)} className="w-full rounded-xl border border-gold/30 bg-gold/8 px-3.5 py-2.5 text-left text-[12.5px] font-semibold text-gold">
          {backupDays === null ? 'Never backed up. ' : `${backupDays} days since your last backup. `}
          Everything lives on this phone — one tap fixes that. →
        </button>
      )}

      {/* Need a push */}
      <Card className="border-accent/30">
        <p className="text-[13px] italic leading-relaxed text-ink-dim">"{quote.text}"</p>
        {quote.source && <p className="mt-1 text-[11px] font-bold text-ink-faint">— {quote.source}</p>}
        <Btn
          className="mt-3 w-full"
          onClick={() => {
            setPushLine(pushCoachMessage('push'))
            setPushOpen(true)
          }}
        >
          I'm feeling lazy — push me
        </Btn>
      </Card>

      {/* Receipts + guide entry points */}
      <div className="grid grid-cols-2 gap-2">
        <Card onClick={() => setLedgerOpen(true)} className="!p-3.5">
          <div className="text-[13.5px] font-extrabold">📋 Receipts</div>
          <div className="mt-0.5 text-[11px] text-ink-faint">
            {data.excuses.length} on record · {unproven} unproven this month
          </div>
        </Card>
        <Card onClick={() => setGuideOpen(true)} className="!p-3.5">
          <div className="text-[13.5px] font-extrabold">📖 The Plan</div>
          <div className="mt-0.5 text-[11px] text-ink-faint">Rules, why it works, exercise library</div>
        </Card>
      </div>

      {/* Feed */}
      <SectionTitle>The record</SectionTitle>
      <div className="space-y-2">
        {data.coach.feed.slice(0, feedCount).map((f) => (
          <Card key={f.id} className="!py-3">
            <div className="flex items-center justify-between">
              <Chip tone={f.kind === 'debrief' ? 'cyan' : f.kind === 'insight' ? 'lime' : 'accent'}>
                {f.kind === 'debrief' ? 'debrief' : f.kind === 'insight' ? 'insight' : (f.situation ?? 'coach')}
              </Chip>
              <span className="text-[10px] font-semibold text-ink-faint">{formatShort(f.at.slice(0, 10))}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">{f.text}</p>
            {f.debrief && (
              <button className="mt-1.5 text-[12px] font-semibold text-cyan underline" onClick={() => setDebrief(f.debrief!)}>
                open debrief
              </button>
            )}
          </Card>
        ))}
        {data.coach.feed.length === 0 && (
          <p className="py-6 text-center text-[12.5px] text-ink-faint">
            Nothing yet. Finish a session and the record starts.
          </p>
        )}
        {data.coach.feed.length > feedCount && (
          <Btn kind="ghost" className="w-full" onClick={() => setFeedCount((c) => c + 20)}>
            Older entries
          </Btn>
        )}
      </div>

      {/* Push sheet */}
      <Sheet open={pushOpen} onClose={() => setPushOpen(false)} title="Alright. Listen.">
        <div className="space-y-3 pb-6">
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-[14.5px] font-bold leading-relaxed text-accent-soft">
            {pushLine}
          </div>
          <SectionTitle>Fuel (videos)</SectionTitle>
          <div className="space-y-2">
            {MOTIVATION_VIDEOS.map((v) => (
              <a
                key={v.title}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(v.query)}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-edge bg-surface-2 px-3.5 py-3"
              >
                <div className="text-[13px] font-bold text-ink">▶ {v.title}</div>
                <div className="text-[11px] text-ink-faint">{v.note}</div>
              </a>
            ))}
          </div>
          <Btn kind="lime" className="w-full" onClick={() => setPushOpen(false)}>
            Fine. I'm going.
          </Btn>
        </div>
      </Sheet>

      {/* Ledger sheet */}
      <Sheet open={ledgerOpen} onClose={() => setLedgerOpen(false)} title="Receipts">
        <ExcuseLedger />
      </Sheet>

      {/* Guide sheet */}
      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="The Plan">
        <GuideReader onOpenExercise={(id) => setGuideExercise(id)} />
      </Sheet>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DataTransferSheet open={dataOpen} onClose={() => setDataOpen(false)} />
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
        <div key={s.id} className="overflow-hidden rounded-xl border border-edge bg-surface">
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
          <span className="text-[13.5px] font-extrabold text-cyan">Exercise library — every guide</span>
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
