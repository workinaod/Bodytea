import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Tile } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { GuideReader } from './GuideReader'
import { BookletScreen } from '../booklet/BookletScreen'
import { ExerciseGuideSheet } from '../today/ExerciseGuideSheet'

// ============================================================
// The two doors into the plan itself.
//
// Reading it and editing it. Both used to hang off a Coach tab
// that no longer exists, which put the rules of the week two
// taps and one tab away from the week. They sit under the tier
// picker now, which is the only place anybody goes looking.
// ============================================================

function Door({
  title,
  sub,
  onClick,
}: {
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <Tile onClick={onClick} ariaLabel={title} className="!py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-black">{title}</div>
          <div className="mt-px text-[10.5px] font-bold text-ink-faint">{sub}</div>
        </div>
        <span className="shrink-0 text-[16px] font-black text-ink-faint">›</span>
      </div>
    </Tile>
  )
}

export function PlanDoors() {
  const plan = useAppStore((s) => s.data.plan)
  const [guideOpen, setGuideOpen] = useState(false)
  const [bookletOpen, setBookletOpen] = useState(false)
  const [exerciseId, setExerciseId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <Door
        title="The Plan"
        sub="Rules, why your week looks like this, exercise guides"
        onClick={() => setGuideOpen(true)}
      />
      <Door
        title={`My Booklet · ${plan.name}`}
        sub={`${plan.daysPerWeek} day${plan.daysPerWeek === 1 ? '' : 's'} a week · fine-tune everything`}
        onClick={() => setBookletOpen(true)}
      />

      <Sheet open={guideOpen} onClose={() => setGuideOpen(false)} title="The Plan">
        <GuideReader onOpenExercise={setExerciseId} />
      </Sheet>
      <ExerciseGuideSheet exerciseId={exerciseId} onClose={() => setExerciseId(null)} />
      {bookletOpen && <BookletScreen onClose={() => setBookletOpen(false)} />}
    </div>
  )
}
