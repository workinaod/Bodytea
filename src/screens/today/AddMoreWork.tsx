import { useState } from 'react'
import type { DebriefData, ISODate } from '../../types'
import { Coin, Tile } from '../../components/ui'
import { Sticker, type StickerName } from '../../components/stickers'
import { Sheet } from '../../components/Sheet'
import { WorkoutsSheet } from './WorkoutsSheet'
import { OwnWorkoutSheet } from './OwnWorkoutSheet'
import { CardioSheet } from './CardioSheet'

// ============================================================
// The mid-session hatch.
//
// Browsing off the plan is a destination and it lives in Train.
// This is not that. This is the door for somebody who is ALREADY
// training today and did something else as well, and it stays on
// Today for the same reason the make-up card does: it is about
// the session in progress, and it expires with the day.
//
// It exists because of a bug the owner reported twice. Nothing
// inside the session view can add an exercise, so an athlete who
// logged extra work on a day they had not started was left with
// nowhere to put the next thing. The sheet says out loud that
// this ADDS, because the thing that went wrong before was the
// day being spent.
// ============================================================

function Option({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: StickerName
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <Tile onClick={onClick} ariaLabel={title} className="!py-3">
      <div className="flex items-center gap-3">
        <Coin size={44}>
          <Sticker name={icon} size={24} />
        </Coin>
        <div className="min-w-0">
          <div className="text-[14px] font-black leading-tight">{title}</div>
          <div className="mt-0.5 text-[11.5px] font-bold leading-snug text-ink-faint">{sub}</div>
        </div>
      </div>
    </Tile>
  )
}

export function AddMoreWork({
  date,
  onLogged,
  onLive,
}: {
  date: ISODate
  /** A debrief only comes back when the day is genuinely over. */
  onLogged: (d: DebriefData | null) => void
  /** A workout started live rather than logged after the fact. */
  onLive: () => void
}) {
  const [hubOpen, setHubOpen] = useState(false)
  const [workoutsOpen, setWorkoutsOpen] = useState(false)
  const [ownOpen, setOwnOpen] = useState(false)
  const [cardioOpen, setCardioOpen] = useState(false)

  const closeAll = () => {
    setHubOpen(false)
    setWorkoutsOpen(false)
    setOwnOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setHubOpen(true)}
        className="flex w-full items-center justify-between gap-2 px-1 py-1.5 text-left"
      >
        <span className="text-[12px] font-extrabold text-ink-faint underline underline-offset-[3px]">
          Did something else too?
        </span>
        <span className="text-[12px] font-black text-cyan">add it ›</span>
      </button>

      <Sheet open={hubOpen} onClose={() => setHubOpen(false)} title="Add more work">
        <div className="space-y-2 pb-8">
          <p className="px-0.5 text-[12px] leading-snug text-ink-dim">
            This gets added to today, it does not replace what you already logged. The day stays open
            until 3am.
          </p>
          <Option
            icon="book"
            title="Browse workouts"
            sub="Ready-made sessions, fitted to your gear."
            onClick={() => setWorkoutsOpen(true)}
          />
          <Option
            icon="wrench"
            title="Your own workout"
            sub="Pick exercises, run it now or log it after."
            onClick={() => setOwnOpen(true)}
          />
          <Option
            icon="runner"
            title="Log cardio"
            sub="Runs, rides, sport, classes."
            onClick={() => setCardioOpen(true)}
          />
        </div>
      </Sheet>

      <WorkoutsSheet
        open={workoutsOpen}
        date={date}
        onClose={() => setWorkoutsOpen(false)}
        onLive={() => {
          closeAll()
          onLive()
        }}
        onLogged={(d) => {
          closeAll()
          onLogged(d)
        }}
      />
      <OwnWorkoutSheet
        open={ownOpen}
        date={date}
        onClose={() => setOwnOpen(false)}
        onLive={() => {
          closeAll()
          onLive()
        }}
        onLogged={(d) => {
          closeAll()
          onLogged(d)
        }}
      />
      <CardioSheet date={date} hasSession open={cardioOpen} onClose={() => setCardioOpen(false)} />
    </>
  )
}
