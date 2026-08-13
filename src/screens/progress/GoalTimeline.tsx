import { useMemo, useState } from 'react'
import type { AppData, ISODate } from '../../types'
import { buildJourney, type Rung } from '../../engine/journey'
import { formatShort } from '../../engine/calendar'
import { SectionTitle } from '../../components/ui'

// ============================================================
// The climb, drawn.
//
// A vertical rail rather than a chart, for three reasons: a
// phone scrolls down, each rung carries a sentence a chart has
// nowhere to put, and at week 40 there are thirty of these —
// which is unreadable across a fixed-width viewBox and perfectly
// readable as a list.
//
// The shape of it is the argument. Everything reached stacks
// ABOVE the today line, oldest first, collapsed to one line
// each: that growing stack of ticks is the answer to "have I
// got anywhere". Everything ahead sits BELOW it with a date,
// nearest first. The grind feels infinite when there is no
// visible next thing and no visible last thing; this screen is
// both, in one column.
// ============================================================

const TONE_DOT: Record<string, string> = {
  accent: 'bg-accent',
  lime: 'bg-lime',
  cyan: 'bg-cyan',
  gold: 'bg-gold',
}

const TONE_TEXT: Record<string, string> = {
  accent: 'text-accent',
  lime: 'text-lime',
  cyan: 'text-cyan',
  gold: 'text-gold',
}

/**
 * The estimate, in the words that keep it an estimate.
 *
 * "~5 weeks · from your rate" and "~14 weeks · typical for your level"
 * are different promises. Printing one number for both is how a guess
 * becomes a claim, and the athlete has no way to tell which they were
 * given. Six words carry the whole honesty of the feature, so they go
 * inline on every row rather than behind a tap.
 */
function EtaLine({ rung }: { rung: Rung }) {
  if (rung.blocker) return <span className="text-[11px] font-semibold text-gold">{rung.blocker} →</span>
  if (rung.etaWeeks === undefined) {
    return <span className="text-[11px] leading-snug text-ink-faint">{rung.note ?? 'Keep climbing.'}</span>
  }
  const w = rung.etaWeeks
  const when = w <= 1 ? 'this week' : w < 8 ? `~${w} weeks` : `~${rung.etaLabel}`
  return (
    <span className="text-[11px] font-semibold text-ink-dim">
      {when} <span className="text-ink-faint">· {rung.basis === 'observed' ? 'from your rate' : 'typical for your level'}</span>
    </span>
  )
}

function ReachedRow({ rung, tone }: { rung: Rung; tone: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-dim">{rung.label}</span>
      <span className="shrink-0 text-[10.5px] font-semibold text-lime">✓ {rung.hitOn ? formatShort(rung.hitOn) : 'done'}</span>
    </div>
  )
}

function AheadRow({ rung, tone, first }: { rung: Rung; tone: string; first: boolean }) {
  return (
    <div className={`flex gap-3 py-2.5 ${first ? '' : 'border-t border-white/[0.05]'}`}>
      <div className="flex flex-col items-center pt-1">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            first ? TONE_DOT[tone] : 'bg-white/20'
          } ${rung.blocker ? '!bg-white/15' : ''}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[13.5px] font-extrabold ${first ? TONE_TEXT[tone] : 'text-ink'}`}>
            {rung.label}
          </span>
          {/* Only on the rung being climbed. Repeating "198 lb now" down
              every row is the same fact four times and it crowds out the
              one number per row that differs. */}
          {first && rung.current !== undefined && !rung.blocker && (
            <span className="shrink-0 font-mono text-[11px] text-ink-faint">
              {Math.round(rung.current * 10) / 10}
              {rung.unit} now
            </span>
          )}
        </div>
        {/* The fill is the one place a number becomes a feeling. */}
        {!rung.blocker && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className={`grow h-full rounded-full ${TONE_DOT[tone]}`}
              style={{ width: `${Math.round(rung.progress * 100)}%` }}
            />
          </div>
        )}
        <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">{rung.detail}</p>
        <div className="mt-1">
          <EtaLine rung={rung} />
        </div>
      </div>
    </div>
  )
}

export function GoalTimeline({ data, today, onAnchor }: { data: AppData; today: ISODate; onAnchor: () => void }) {
  const journey = useMemo(() => buildJourney(data, today), [data, today])
  const [showAll, setShowAll] = useState(false)
  const [track, setTrack] = useState<string | null>(null)

  const rail = track ? journey.rail.filter((r) => r.track === track) : journey.rail
  const done = rail.filter((r) => r.state === 'done')
  const ahead = rail.filter((r) => r.state !== 'done')

  if (journey.totalCount === 0) return null

  // At week 40 the reached stack is thirty rows deep. Collapsed, it is
  // still the point — a dense column of ticks — without being a year of
  // scrolling to reach today.
  const shownDone = showAll ? done : done.slice(-4)
  const hidden = done.length - shownDone.length

  return (
    <>
      <SectionTitle
        right={
          <span className="text-[11px] font-bold text-ink-faint">
            {journey.doneCount} of {journey.totalCount}
          </span>
        }
      >
        The climb
      </SectionTitle>

      {/* Track filter. Every goal climbs more than one strand, so a
          stalled scale never greys out the whole board. */}
      {journey.tracks.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            onClick={() => setTrack(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
              track === null ? 'bg-white/[0.1] text-ink' : 'bg-white/[0.04] text-ink-faint'
            }`}
          >
            All
          </button>
          {journey.tracks.map((t) => (
            <button
              key={t.id}
              onClick={() => setTrack(t.id === track ? null : t.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
                track === t.id ? 'bg-white/[0.1] text-ink' : 'bg-white/[0.04] text-ink-faint'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl bg-white/[0.045] px-4 py-3 ring-1 ring-white/[0.05]">
        {done.length > 0 && (
          <div>
            {hidden > 0 && (
              <button
                onClick={() => setShowAll(true)}
                className="mb-1 w-full py-1 text-left text-[11px] font-bold text-ink-faint underline"
              >
                {hidden} more already behind you
              </button>
            )}
            {shownDone.map((r) => (
              <ReachedRow key={r.id} rung={r} tone={toneOf(journey, r)} />
            ))}
          </div>
        )}

        {/* Where they are, right now. */}
        <div className="my-2 flex items-center gap-2">
          <span className="h-px flex-1 bg-white/[0.12]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-ink-faint">you are here</span>
          <span className="h-px flex-1 bg-white/[0.12]" />
        </div>

        {ahead.length === 0 ? (
          <p className="py-2 text-[12px] leading-snug text-ink-dim">
            Everything on this track is behind you. Set a new number and the ladder rebuilds around it.
          </p>
        ) : (
          <div className="enter-stagger">
            {ahead.map((r, i) => (
              <div key={r.id} onClick={r.blocker ? onAnchor : undefined} className={r.blocker ? 'cursor-pointer' : ''}>
                <AheadRow rung={r} tone={toneOf(journey, r)} first={i === 0} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* The contract, said out loud. It is the reason the rail can be
          trusted, and it is not obvious unless it is written down. */}
      <p className="px-1 text-[10.5px] leading-snug text-ink-faint">
        Targets never move. The dates do — they are recomputed every time you log something, and they are estimates,
        not promises. A week off pushes them out; a good block pulls them in.
      </p>
    </>
  )
}

function toneOf(journey: ReturnType<typeof buildJourney>, r: Rung): string {
  return journey.tracks.find((t) => t.id === r.track)?.tone ?? 'accent'
}
