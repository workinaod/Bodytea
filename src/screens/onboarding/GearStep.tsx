import type { EquipTag, Goal } from '../../types'
import { Btn, Card, ChoiceChip } from '../../components/ui'
import { accessFor, HOME_CHECKLIST } from './onboardingData'

// ============================================================
// Where they train, and what they can get to.
//
// The second half of this screen used to ask everybody the same
// thing — "hoop or court?" — which is the right question for one
// goal out of seven. It is now keyed to the goal, so a runner is
// asked about a track and somebody losing weight is asked about
// a park, which is the difference between a question and noise.
// ============================================================

export function GearStep(p: {
  goal: Goal
  profile: 'gym' | 'home-db' | 'minimal'
  pickProfile: (v: 'gym' | 'home-db' | 'minimal') => void
  extras: Set<EquipTag>
  toggleItem: (tags: EquipTag[]) => void
  next: () => void
}) {
  const { goal, profile, pickProfile, extras, toggleItem, next } = p
  return (
          <div className="flex flex-1 flex-col">
            <h2 className="headline text-center text-[26px]">Where do you train?</h2>
            <div className="mt-4 space-y-2">
              {(
                [
                  ['gym', 'Full gym', 'Racks, machines, cables, the works.'],
                  ['home-db', 'Home gym', "You'll check off exactly what you've got."],
                  ['minimal', 'No weights', 'Bodyweight + somewhere to move.'],
                ] as const
              ).map(([id, title, sub]) => (
                <Card key={id} onClick={() => pickProfile(id)} className={profile === id ? '!border-accent/60' : ''}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[15px] font-black">{title}</div>
                      <div className="text-[12px] text-ink-dim">{sub}</div>
                    </div>
                    <span className={`h-4 w-4 rounded-full border-2 ${profile === id ? 'border-accent bg-accent' : 'border-edge'}`} />
                  </div>
                </Card>
              ))}
            </div>
            {profile === 'home-db' && (
              <>
                <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">
                  Check everything you have
                </p>
                <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">
                  Nothing is assumed. The plan only prescribes gear you check. Check nothing and you get
                  a bodyweight plan.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HOME_CHECKLIST.map((e) => (
                    <ChoiceChip
                      key={e.label}
                      selected={e.tags.every((t) => extras.has(t))}
                      onClick={() => toggleItem(e.tags)}
                    >
                      {e.label}
                    </ChoiceChip>
                  ))}
                </div>
              </>
            )}
            <p className="mt-5 text-[12px] font-black uppercase tracking-wider text-ink-faint">Can you get to any of these?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {accessFor(goal, profile).map((e) => (
                <ChoiceChip
                  key={e.label}
                  selected={e.tags.every((t) => extras.has(t))}
                  onClick={() => toggleItem(e.tags)}
                >
                  {e.label}
                </ChoiceChip>
              ))}
            </div>
            <Btn className="mt-6 w-full py-4" onClick={next}>
              Next: experience
            </Btn>
          </div>
  )
}
