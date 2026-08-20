import { useState } from 'react'
import { ScreenHeader, Segmented } from '../../components/ui'
import { WeekScreen } from '../week/WeekScreen'
import { MealsScreen } from '../meals/MealsScreen'

// ============================================================
// The program, in one tab.
//
// Training and nutrition were two separate destinations, which
// made them read as two separate plans. They are one plan: the
// week decides the days, the days decide the calories. Putting
// them behind one switch says that out loud and gives the fifth
// tab back to the person instead of spending it on a second
// calendar.
//
// Neither screen is rebuilt. Each one keeps everything it had
// and swaps its own title bar for a slimmer one, because two
// stacked headers is what an embedded screen looks like when
// nobody thought about it.
// ============================================================

type PlanView = 'training' | 'nutrition'

export function MyPlanScreen() {
  const [view, setView] = useState<PlanView>('training')

  return (
    <div className="stagger space-y-3 pb-6">
      <ScreenHeader title="My Plan" />

      <Segmented
        value={view}
        onChange={setView}
        options={[
          { id: 'training', label: 'Training' },
          { id: 'nutrition', label: 'Nutrition' },
        ]}
      />

      {view === 'training' ? <WeekScreen embedded /> : <MealsScreen embedded />}
    </div>
  )
}
