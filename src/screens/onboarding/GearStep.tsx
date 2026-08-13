import { useState } from 'react'
import type { EquipTag, Goal } from '../../types'
import { Btn, Card, ChoiceChip, Reveal } from '../../components/ui'
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
  /** Their follow-up answers, so a named sport beats a guessed goal. */
  answers: Record<string, string>
  profile: 'gym' | 'home-db' | 'minimal'
  pickProfile: (v: 'gym' | 'home-db' | 'minimal') => void
  extras: Set<EquipTag>
  toggleItem: (tags: EquipTag[]) => void
  next: () => void
}) {
  const { goal, answers, profile, pickProfile, extras, toggleItem, next } = p
  // A profile is pre-selected, so what opens the rest of the screen is
  // them choosing one — including choosing the one that was already lit.
  const [chose, setChose] = useState(false)
  return (
          <div className="flex flex-1 flex-col">
            <h2 className="headline text-center text-[30px]">Where do you train?</h2>
            <div className="mx-auto mt-5 w-full max-w-[22rem] space-y-2.5">
              {(
                [
                  ['gym', 'Full gym', 'Racks, machines, cables, the works.'],
                  ['home-db', 'Home gym', "You'll check off exactly what you've got."],
                  ['minimal', 'No weights', 'Bodyweight + somewhere to move.'],
                ] as const
              ).map(([id, title, sub]) => (
                <Card
                  key={id}
                  onClick={() => {
                    setChose(true)
                    pickProfile(id)
                  }} className={profile === id ? '!border-accent/60' : ''}>
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
            {chose && profile === 'home-db' && (
              <Reveal when className="mt-5">
                <p className="text-center text-[12px] font-black uppercase tracking-[0.16em] text-ink-faint">
                  Check everything you have
                </p>
                <div className="mt-2.5 flex flex-wrap justify-center gap-2">
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
              </Reveal>
            )}
            <Reveal when={chose} className="mt-5">
              <p className="text-center text-[12px] font-black uppercase tracking-[0.16em] text-ink-faint">Can you get to any of these?</p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                {accessFor(goal, profile, answers).map((e) => (
                  <ChoiceChip
                    key={e.label}
                    selected={e.tags.every((t) => extras.has(t))}
                    onClick={() => toggleItem(e.tags)}
                  >
                    {e.label}
                  </ChoiceChip>
                ))}
              </div>
            </Reveal>
            <Btn className="mt-6 w-full py-4" onClick={next}>
              Next: experience
            </Btn>
          </div>
  )
}
