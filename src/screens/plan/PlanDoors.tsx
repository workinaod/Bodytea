import { useState } from 'react'
import type { ISODate } from '../../types'
import { useAppStore } from '../../store/appStore'
import { Coin, Tile } from '../../components/ui'
import { Sticker, type StickerName } from '../../components/stickers'
import { Sheet } from '../../components/Sheet'
import { GuideReader } from './GuideReader'
import { BookletScreen } from '../booklet/BookletScreen'
import { ExerciseGuideSheet } from '../today/ExerciseGuideSheet'
import { LifeEventsSheet } from '../week/LifeEventsSheet'

// ============================================================
// The doors into the plan itself.
//
// Reading it, editing it, and telling it what your week looks
// like outside the gym. The first two used to hang off a Coach
// tab that no longer exists, which put the rules of the week
// two taps and one tab away from the week. The third was an
// inline form halfway down the week screen. They sit under the
// tier picker now, which is the only place anybody goes
// looking, and each one is a row rather than a section.
// ============================================================

function Door({
  title,
  sub,
  icon,
  onClick,
}: {
  title: string
  sub: string
  /** The same 44px panel coin Train's launchers wear. Three identical grey
      slabs in a column is the list look the concept exists to replace. */
  icon: StickerName
  onClick: () => void
}) {
  return (
    <Tile onClick={onClick} ariaLabel={title} className="!py-3">
      <div className="flex items-center gap-3">
        <Coin size={44} tone="panel">
          <Sticker name={icon} size={22} />
        </Coin>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-black">{title}</div>
          <div className="mt-px text-[10.5px] font-bold text-ink-faint">{sub}</div>
        </div>
        <span className="shrink-0 text-[16px] font-black text-ink-faint">›</span>
      </div>
    </Tile>
  )
}

export function PlanDoors({ weekStart }: { weekStart: ISODate }) {
  const plan = useAppStore((s) => s.data.plan)
  const events = useAppStore((s) => s.data.weeks[weekStart]?.events)
  const [guideOpen, setGuideOpen] = useState(false)
  const [bookletOpen, setBookletOpen] = useState(false)
  const [lifeOpen, setLifeOpen] = useState(false)
  const [exerciseId, setExerciseId] = useState<string | null>(null)

  // What is already marked on this week, so the row reports rather than
  // just offering. Zero is said as "nothing marked", never as "0".
  const marked = plan.lifeEvents.filter((ev) => (events?.[ev.id] ?? []).length > 0)

  return (
    <div className="space-y-2">
      <Door
        title="The Plan"
        icon="book"
        sub="Rules, why your week looks like this, exercise guides"
        onClick={() => setGuideOpen(true)}
      />
      <Door
        title={`My Booklet · ${plan.name}`}
        icon="wrench"
        sub={`${plan.daysPerWeek} day${plan.daysPerWeek === 1 ? '' : 's'} a week · fine-tune everything`}
        onClick={() => setBookletOpen(true)}
      />
      <Door
        title="Life this week"
        icon="calendar"
        sub={
          marked.length > 0
            ? marked.map((ev) => ev.label).join(' · ')
            : 'Gigs, shifts, bad nights. The plan bends around them'
        }
        onClick={() => setLifeOpen(true)}
      />

      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="The Plan">
        <GuideReader onOpenExercise={setExerciseId} />
      </Sheet>
      <ExerciseGuideSheet exerciseId={exerciseId} onClose={() => setExerciseId(null)} />
      <LifeEventsSheet weekStart={weekStart} open={lifeOpen} onClose={() => setLifeOpen(false)} />
      {bookletOpen && <BookletScreen onClose={() => setBookletOpen(false)} />}
    </div>
  )
}
