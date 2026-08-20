import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppData, ISODate } from '../../types'
import { buildJourney, type Stage } from '../../engine/journey'
import { Sticker } from '../../components/stickers'
import { formatShort } from '../../engine/calendar'
import { SectionTitle } from '../../components/ui'
import { StageSheet } from './StageSheet'

// ============================================================
// The climb, as a path you walk rather than a list you read.
//
// A vertical path was the first version and it was legible and
// completely inert — it read as a to-do list with dates, which
// is the feeling the whole feature exists to get rid of. A
// winding path with stages on it says something a list cannot:
// there is a route, you are ON it, and it ends somewhere.
//
// Horizontal, so the direction of travel is the direction you
// swipe, and so what is behind you stays visible over your
// shoulder rather than scrolling away above.
//
// Because a node has no room for a sentence, tapping one opens
// it. That is the better split anyway: the path is the shape of
// the journey, the sheet is the detail of one stage.
// ============================================================

/** Stage spacing. Roughly 3.5 stages visible on a 390px screen. */
const STEP = 104
const PAD_X = 56
const HEIGHT = 208

/**
 * The heights the path wanders between.
 *
 * Four positions rather than two. Strict high-low-high-low is a
 * metronome — every segment is the same curve mirrored, and after three
 * of them the eye quits reading it as a route and starts reading it as
 * a zigzag chart. Passing through the middle on the way up and again on
 * the way down gives a longer wave with no repeated segment, which is
 * what makes it look walked rather than plotted.
 */
const Y_WAVE = [122, 78, 58, 96]

const TONE_VAR: Record<string, string> = {
  accent: 'var(--color-accent)',
  lime: 'var(--color-lime)',
  cyan: 'var(--color-cyan)',
  gold: 'var(--color-gold)',
}

function pointsFor(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    x: PAD_X + i * STEP,
    y: Y_WAVE[i % Y_WAVE.length],
  }))
}

/**
 * A smooth road through the stages.
 *
 * Cubic segments with horizontal control handles, so the path leaves
 * and enters every node flat. Straight lines between alternating
 * heights read as a zigzag chart; curves read as a road.
 */
function pathThrough(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const k = (b.x - a.x) * 0.5
    d += ` C ${a.x + k} ${a.y}, ${b.x - k} ${b.y}, ${b.x} ${b.y}`
  }
  return d
}

function shortEta(stage: Stage): string {
  if (stage.blocker) return 'locked'
  if (stage.etaWeeks === undefined) return '—'
  return stage.etaWeeks <= 1 ? 'this week' : stage.etaWeeks < 9 ? `${stage.etaWeeks}w` : (stage.etaLabel ?? '')
}

export function GoalTimeline({ data, today, onAnchor }: { data: AppData; today: ISODate; onAnchor: () => void }) {
  const journey = useMemo(() => buildJourney(data, today), [data, today])
  const [track, setTrack] = useState<string | null>(null)
  const [open, setOpen] = useState<Stage | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const stages = track ? journey.path.filter((r) => r.track === track) : journey.path
  // Exactly ONE stage is "you are here".
  //
  // `next` is per-track, so the unfiltered path had three of them and
  // three nodes shouting HERE at once, which is no position at all. The
  // path is one road: the soonest of them is where the walker actually
  // stands, and the others are the head of their own strand and get a
  // quieter mark.
  const hereIdx = stages.findIndex((r) => r.state === 'next')
  const hereId = hereIdx >= 0 ? stages[hereIdx].id : null
  const doneCount = stages.filter((r) => r.state === 'done').length

  // Land the view on where they are, not on where they started. Without
  // this the path opens at stage one and a person eight months in has to
  // swipe past their whole history to find themselves.
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const i = hereIdx >= 0 ? hereIdx : doneCount
    el.scrollLeft = Math.max(0, PAD_X + i * STEP - el.clientWidth / 2.6)
  }, [hereIdx, doneCount, track])

  if (journey.totalCount === 0) return null

  const pts = pointsFor(stages.length)
  const width = PAD_X * 2 + Math.max(0, stages.length - 1) * STEP
  // The road behind is drawn in colour and the road ahead in grey, so
  // the fill IS the progress bar and there is no second one.
  const walkedTo = hereIdx >= 0 ? hereIdx : stages.length - 1
  const walked = pathThrough(pts.slice(0, Math.max(1, walkedTo + 1)))
  const whole = pathThrough(pts)
  const next = journey.next

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

      {/* Where they are and what is immediately next, in one line, so
          the answer is there before anybody swipes anything. */}
      {next && (
        <p className="-mt-1 px-1 text-[12px] leading-snug text-ink-dim">
          Next up <span className="font-bold text-ink">{next.label}</span>
          {next.etaWeeks !== undefined && (
            <>
              {' · '}
              {next.etaWeeks <= 1 ? 'this week' : next.etaWeeks < 9 ? `~${next.etaWeeks} weeks` : `~${next.etaLabel}`}
              <span className="text-ink-faint">
                {' '}
                {next.basis === 'observed' ? 'at your rate' : 'typical for your level'}
              </span>
            </>
          )}
        </p>
      )}

      {journey.tracks.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {[{ id: null, label: 'All' }, ...journey.tracks.map((t) => ({ id: t.id as string | null, label: t.label }))].map(
            (t) => (
              <button
                key={t.label}
                onClick={() => setTrack(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11.5px] font-bold ${
                  track === t.id ? 'bg-white/[0.1] text-ink' : 'bg-white/[0.04] text-ink-faint'
                }`}
              >
                {t.label}
              </button>
            ),
          )}
        </div>
      )}

      <div
        ref={scroller}
        className="-mx-4 overflow-x-auto overflow-y-hidden px-0"
        style={{ scrollbarWidth: 'none' }}
        aria-label="Your climb, stage by stage"
      >
        <div className="relative" style={{ width, height: HEIGHT }}>
          <svg width={width} height={HEIGHT} className="absolute inset-0" aria-hidden>
            <path d={whole} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={5} strokeLinecap="round" />
            {doneCount > 0 && (
              <path
                d={walked}
                fill="none"
                stroke="rgba(198,242,78,0.55)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="1 0"
              />
            )}
          </svg>

          {stages.map((r, i) => {
            const p = pts[i]
            const tone = journey.tracks.find((t) => t.id === r.track)?.tone ?? 'accent'
            const colour = TONE_VAR[tone]
            const isHere = r.id === hereId
            const isTrackHead = r.state === 'next' && !isHere
            const done = r.state === 'done'
            const size = isHere ? 54 : done ? 42 : 38
            return (
              <button
                key={r.id}
                onClick={() => (r.blocker ? onAnchor() : setOpen(r))}
                className="press absolute flex flex-col items-center"
                style={{ left: p.x - 46, top: p.y - size / 2 - 2, width: 92 }}
              >
                {/* Flat, edged, lipped: the same node the week path uses, one
                    size up. It used to be a translucent disc with a 22px glow
                    behind HERE, which is the exact look the concept replaced
                    (see research/OP12-visual-law.md: zero glow, anywhere). */}
                <span
                  className="flex items-center justify-center rounded-full font-black"
                  style={{
                    width: size,
                    height: size,
                    background: isHere || done ? colour : 'var(--color-surface-2)',
                    border: isHere
                      ? '2px solid #fff'
                      : done
                        ? `2px solid ${colour}`
                        : isTrackHead || r.isGoal
                          ? `2px solid ${colour}`
                          : '2px dashed var(--color-edge)',
                    color: isHere || done ? 'var(--color-bg)' : isTrackHead || r.isGoal ? colour : 'var(--color-ink-faint)',
                    fontSize: isHere ? 12.5 : 15,
                    boxShadow: `0 3px 0 ${isHere || done ? 'rgba(0,0,0,0.35)' : 'var(--color-edge)'}`,
                  }}
                >
                  {done ? '✓' : isHere ? 'HERE' : r.isGoal ? <Sticker name="trophy" size={16} /> : ''}
                </span>
                <span
                  className={`mt-1.5 w-full truncate text-center text-[11px] font-bold leading-tight ${
                    done ? 'text-ink-dim' : isHere || isTrackHead ? 'text-ink' : 'text-ink-faint'
                  }`}
                >
                  {r.label}
                </span>
                <span className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-faint">
                  {done ? (r.hitOn ? formatShort(r.hitOn) : 'done') : shortEta(r)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="px-1 text-[10.5px] leading-snug text-ink-faint">
        Tap any stage for what it takes. Targets never move. The dates do, and they are estimates, not promises.
      </p>

      {open && <StageSheet stage={open} onClose={() => setOpen(null)} />}
    </>
  )
}
