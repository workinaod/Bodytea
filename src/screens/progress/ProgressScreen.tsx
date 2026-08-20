import { useMemo, useState } from 'react'
import type { Measurement } from '../../types'
import { useAppStore } from '../../store/appStore'
import { formatShort, weekdayOf } from '../../engine/calendar'
import { useToday } from '../../logic/clock'
import { streakDays } from '../../engine/streak'
import { adherenceMap, totalSessions } from '../../engine/stats'
import { Btn, Chip, ScreenHeader, Segmented, Tile } from '../../components/ui'
import { Heatmap } from '../../components/charts'
import { buildMilestoneReview, reviewReady, type MilestoneReview, type ReviewMarkId } from '../../engine/review'
import { MilestoneReviewSheet } from './MilestoneReview'
import { CheckinSheet } from './CheckinSheet'
import { ReviewShelf } from './ReviewShelf'
import { WeeklyRecap } from './WeeklyRecap'
import { RecordView } from './RecordView'
import { ProgressBody } from './ProgressBody'
import { TrendsTile } from './TrendsTile'
import { Flame } from '../../components/Flame'
import { BoardContent } from '../board/BoardScreen'
import { ActivityLog } from './ActivityLog'
import { GoalTimeline } from './GoalTimeline'
import { usePhotoUrl } from './usePhotoUrl'

// ============================================================
// Progress, per research/OP12-screen-law.md §7.
//
// Twelve blocks, and the law says twelve is a ceiling rather
// than a target: the body, the counters, the climb, the last
// twelve weeks. Everything under that heading is ONE object
// each. It shipped at twenty-four because every approved piece
// got added on top of the old screen instead of replacing part
// of it, which is what e2e/density.spec.ts now measures.
// ============================================================

export function ProgressScreen() {
  const data = useAppStore((s) => s.data)
  const update = useAppStore((s) => s.update)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [review, setReview] = useState<MilestoneReview | null>(null)
  const [recapOpen, setRecapOpen] = useState(false)
  const [view, setView] = useState<'me' | 'record' | 'board'>('me')

  // The same streak the flame counts, so one number means one thing.
  const streak = streakDays(data)
  const sessions = totalSessions(data)
  const heat = useMemo(() => adherenceMap(data, 12 * 7), [data])
  const today = useToday()
  const isCheckinDay = weekdayOf(today) === data.settings.checkinWeekday
  const lastCheckin = data.measurements[data.measurements.length - 1]
  const checkinDue =
    isCheckinDay && (!lastCheckin || lastCheckin.date !== today)
  // A milestone that unlocked and has not been opened yet.
  const ready = useMemo(() => reviewReady(data, today), [data, today])

  // Opening a milestone marks it seen, so the offer above stops asking.
  function openMark(id: ReviewMarkId) {
    setReview(buildMilestoneReview(data, id, today))
    update((d) => {
      if (!(d.settings.reviewsSeen ?? []).includes(id)) {
        d.settings.reviewsSeen = [...(d.settings.reviewsSeen ?? []), id]
      }
    })
  }

  return (
    <div className="stagger space-y-3 pb-6">
      <ScreenHeader title="Progress" />

      {/* Three lenses on the same history: your numbers, what actually
          happened, and where you stand against everyone else. The trophy
          case moved to Profile, because badges are identity. */}
      <Segmented
        value={view}
        onChange={setView}
        options={[
          { id: 'me', label: 'Progress' },
          { id: 'record', label: 'Record' },
          { id: 'board', label: 'The Board' },
        ]}
      />

      {view === 'board' && <BoardContent />}
      {view === 'record' && <RecordView />}

      {view === 'me' && (
        <>
          {/* Anything the calendar has ready for them, in one column. Two
              prompts that mean the same thing ("this is waiting for you")
              were two separate cards on two separate rows. */}
          <div className="space-y-3 empty:hidden">
            {checkinDue && (
              <Tile tone="heat">
                <p className="text-[13.5px] font-black text-accent-soft">Weekly check-in day</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
                  Same morning, same conditions. Write it down or it didn't happen.
                </p>
                <Btn className="mt-2.5 w-full" onClick={() => setCheckinOpen(true)}>
                  Do the check-in
                </Btn>
              </Tile>
            )}
            {ready && (
              <Tile tone="gold">
                <div className="eyebrow text-gold">Ready</div>
                <p className="mt-1 text-[13.5px] font-black">Your {ready.label.toLowerCase()} is ready</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-dim">
                  {ready.days} days on the books. Deltas, before/after, and an honest read on gains vs effort.
                </p>
                <Btn className="mt-2.5 w-full" onClick={() => openMark(ready.id)}>
                  Open the review
                </Btn>
              </Tile>
            )}
          </div>

          {/* The body leads. What changed because you showed up, drawn on
              the thing that changed, before any chart gets a word in. */}
          <ProgressBody data={data} today={today} />

          {/* Records strip */}
          <div className="grid grid-cols-3 gap-2">
            <Tile className="!px-2 !py-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                {streak > 0 && <Flame streak={streak} size={13} />}
                <span className="num text-[23px] font-black leading-none text-accent-soft">{streak}</span>
              </div>
              <div className="eyebrow mt-1 text-[9px] text-ink-faint">streak</div>
            </Tile>
            <Tile className="!px-2 !py-2.5 text-center">
              <div className="num text-[23px] font-black leading-none text-lime">{sessions}</div>
              <div className="eyebrow mt-1 text-[9px] text-ink-faint">sessions</div>
            </Tile>
            <Tile className="!px-2 !py-2.5 text-center">
              <div className="num text-[23px] font-black leading-none text-cyan">{data.measurements.length}</div>
              <div className="eyebrow mt-1 text-[9px] text-ink-faint">check-ins</div>
            </Tile>
          </div>

          {/* The climb: its own section title and ONE tile.
              Directly under the three counters, because those say what has
              happened and this says where it is going, and "am I getting
              anywhere" is the question the whole screen exists to answer. */}
          <GoalTimeline data={data} today={today} onAnchor={() => setCheckinOpen(true)} />

          {/* The heading is ON the tile. It was a SectionTitle above it,
              and it never headed a section: the trends below run 30 days
              or all time, and the reviews are rolling. It heads the
              heatmap, so it lives on the heatmap. */}
          <Tile>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <span className="eyebrow text-ink-faint">Last 12 weeks</span>
              <button onClick={() => setRecapOpen(true)} className="press text-[11px] font-bold text-accent underline">
                ▶ replay my week
              </button>
            </div>
            <Heatmap days={heat} />
          </Tile>

          <TrendsTile data={data} today={today} onLogMeasurements={() => setCheckinOpen(true)} />

          {/* Sport, runs and rides: what conditioning the month actually
              held, on top of the lifting. */}
          <ActivityLog data={data} today={today} />

          <PhotoCompare measurements={data.measurements} />

          <ReviewShelf
            data={data}
            today={today}
            onTakePhotos={() => setCheckinOpen(true)}
            onOpenMark={openMark}
          />
        </>
      )}

      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} onSaved={() => setRecapOpen(true)} last={lastCheckin} />
      {recapOpen && <WeeklyRecap data={data} today={today} onClose={() => setRecapOpen(false)} />}
      {review && <MilestoneReviewSheet review={review} onClose={() => setReview(null)} />}
    </div>
  )
}

// ---------- Check-in sheet ----------

// ---------- Photo compare ----------

function PhotoCompare({ measurements }: { measurements: Measurement[] }) {
  const withPhotos = measurements.filter((m) => Object.keys(m.photoIds).length > 0)
  const [angle, setAngle] = useState<'front' | 'side' | 'back'>('front')
  const [leftIdx, setLeftIdx] = useState(0)
  const [rightIdx, setRightIdx] = useState(Math.max(0, withPhotos.length - 1))
  const left = withPhotos[leftIdx]
  const right = withPhotos[rightIdx]
  const leftUrl = usePhotoUrl(left?.photoIds[angle])
  const rightUrl = usePhotoUrl(right?.photoIds[angle])

  // The heading is ON the tile. It used to be a SectionTitle above it,
  // which is a whole block spent saying what the picture already says.
  const head = <div className="eyebrow text-ink-faint">Progress photos</div>

  if (withPhotos.length === 0) {
    return (
      <Tile>
        {head}
        <p className="mt-2 py-1 text-[12.5px] leading-snug text-ink-faint">
          No photos yet. The mirror lags the logbook. Photos catch it moving.
        </p>
      </Tile>
    )
  }

  return (
    <Tile className="space-y-2.5">
      {head}
      <div className="flex gap-1.5">
        {(['front', 'side', 'back'] as const).map((a) => (
          <Chip key={a} tone={angle === a ? 'accent' : 'default'} pressed={angle === a} onClick={() => setAngle(a)}>
            {a}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { url: leftUrl, m: left, idx: leftIdx, set: setLeftIdx },
          { url: rightUrl, m: right, idx: rightIdx, set: setRightIdx },
        ].map((side, i) => (
          <div key={i}>
            <div className="aspect-[3/4] overflow-hidden rounded-xl border-2 border-edge bg-surface-2">
              {side.url ? (
                <img src={side.url} alt="progress" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-ink-faint">
                  no {angle} photo
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between">
              <button className="px-2 text-ink-faint" onClick={() => side.set(Math.max(0, side.idx - 1))}>‹</button>
              <span className="text-[10.5px] font-bold text-ink-dim">{side.m ? formatShort(side.m.date) : ', '}</span>
              <button className="px-2 text-ink-faint" onClick={() => side.set(Math.min(withPhotos.length - 1, side.idx + 1))}>›</button>
            </div>
          </div>
        ))}
      </div>
    </Tile>
  )
}
