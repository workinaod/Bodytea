import type { ISODate } from '../types'
import { minimumViableFor } from '../engine/transforms'
import { planTemplate, resolveDay } from '../engine/resolveDay'
import { useAppStore } from '../store/appStore'

// ============================================================
// Acting on "I am short on time".
//
// Deliberately its own file, and deliberately not part of the
// fatigue side. The ruling that shapes this: "the cant finish
// button is for when a workout is too hard but if theres a
// scheduling or time issue just have a check for time." Two
// different problems, two different controls, two different
// sets of consequences. A day cut short because the gym closes
// is not evidence about how strong anyone is, and it must not
// end up in the fatigue notes that later sessions learn from.
// ============================================================

const store = () => useAppStore.getState()

export interface CutResult {
  /** What the template calls its stripped-back version. */
  label: string
  /** Movements stood down. */
  dropped: number
  /** Sets no longer being asked for. */
  setsSaved: number
}

/**
 * Keep the movements the day cannot do without, stand down the rest.
 *
 * The essentials come from the template's own authored recipe, which
 * is the same counter-offer the skip flow has always made, so a
 * shortened day is shortened the way the plan's author would have
 * shortened it rather than by lopping off the tail.
 *
 * Anything already logged stays exactly as performed, and an exercise
 * mid-way through is kept: dropping a movement you have already
 * started buys almost no time and loses the sets you did.
 */
export function cutToEssentials(date: ISODate): CutResult | null {
  const data = store().data
  const session = data.sessions[date]
  if (!session) return null

  const day = resolveDay(session.makeupFor ?? date, data)
  if (!day.templateId) return null
  const template = planTemplate(data.plan, day.templateId)
  const keep = new Set(minimumViableFor(template, day.exercises).exercises.map((e) => e.exerciseId))
  const label = minimumViableFor(template, day.exercises).label

  const drop: number[] = []
  let setsSaved = 0
  session.exercises.forEach((ex, i) => {
    if (ex.skipped) return
    if (keep.has(ex.exerciseId)) return
    const undone = ex.sets.filter((s) => !s.done).length
    // Untouched movements only. One already started has banked work.
    if (undone === 0 || undone < ex.sets.length) return
    drop.push(i)
    setsSaved += undone
  })
  if (drop.length === 0) return { label, dropped: 0, setsSaved: 0 }

  store().update((d) => {
    const s = d.sessions[date]
    if (!s) return
    for (const i of drop) {
      const ex = s.exercises[i]
      if (ex) ex.skipped = true
    }
  })
  return { label, dropped: drop.length, setsSaved }
}
