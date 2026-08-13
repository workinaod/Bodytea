import { useState } from 'react'
import type { EquipTag, Goal } from '../../types'
import { Reveal } from '../../components/ui'
import { Bar, Kicker, Label, Lane, Tag, Title } from './kit'
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
            <Kicker>Entry 05</Kicker>
            <Title>Where do you train?</Title>
            <div className="mt-6 border-t border-white/[0.14]">
              {(
                [
                  ['gym', 'Full gym'],
                  ['home-db', 'Home gym'],
                  ['minimal', 'No weights'],
                ] as const
              ).map(([id, title], i) => (
                <Lane
                  key={id}
                  n={i + 1}
                  selected={chose && profile === id}
                  onClick={() => {
                    setChose(true)
                    pickProfile(id)
                  }}
                >
                  {title}
                </Lane>
              ))}
            </div>
            {chose && profile === 'home-db' && (
              <Reveal when className="mt-8">
                <Label>Check everything you have</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HOME_CHECKLIST.map((e) => (
                    <Tag key={e.label} selected={e.tags.every((t) => extras.has(t))} onClick={() => toggleItem(e.tags)}>
                      {e.label}
                    </Tag>
                  ))}
                </div>
              </Reveal>
            )}
            <Reveal when={chose} className="mt-8">
              <Label>Can you get to any of these?</Label>
              <div className="flex flex-wrap gap-1.5">
                {accessFor(goal, profile, answers).map((e) => (
                  <Tag key={e.label} selected={e.tags.every((t) => extras.has(t))} onClick={() => toggleItem(e.tags)}>
                    {e.label}
                  </Tag>
                ))}
              </div>
            </Reveal>
            <div className="mt-auto pt-10">
              <Bar onClick={next}>Next: experience</Bar>
            </div>
          </div>
  )
}
