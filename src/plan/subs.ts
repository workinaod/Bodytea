import type { EquipTag, PlanConfig } from '../types'
import { EXERCISES } from './exercises'
import { canDo, SUBSTITUTIONS } from './equip'
import { musclesFor } from './muscles'
import { athleticFor, athleticSubsFor } from './athletic'

// ============================================================
// Swap candidates for the 🔄 button on a Today row. Every
// candidate must preserve the slot's training intent: athletic
// drills swap within their quality (never leveling up), lifts
// swap along the plan's own block rotation, the curated
// substitution chains, or same-kind muscle overlap. Everything
// is filtered by the user's equipment and the day's contents.
// ============================================================

const MAX_CANDIDATES = 6

/**
 * Ordered swap candidates for an exercise: the plan's own block
 * rotation for slot entries first (that rotation IS the designed
 * alternative set), then quality-preserving athletic subs, then the
 * curated substitution chains, then same-kind lifts sharing a primary
 * muscle. Only equipment-legal exercises not already in the day.
 */
export function swapCandidatesFor(
  id: string,
  plan: PlanConfig,
  dayExerciseIds: string[] = [],
): string[] {
  const owned = new Set<EquipTag>(['none', ...plan.equipment])
  const taken = new Set(dayExerciseIds)
  taken.delete(id)

  const ranked: string[] = []

  // 1. Block-rotation siblings, when this exercise lives in a slot.
  for (const block of [1, 2, 3] as const) {
    const slots = plan.slots[block] ?? {}
    for (const [slotId, ex] of Object.entries(slots)) {
      if (ex !== id) continue
      for (const b of [1, 2, 3] as const) {
        const alt = plan.slots[b]?.[slotId]
        if (alt) ranked.push(alt)
      }
    }
  }

  // 2. Athletic library: same primary quality, same level or easier.
  const qualitySubs = new Set(athleticFor(id) ? athleticSubsFor(id) : [])
  ranked.push(...qualitySubs)

  // 3. Curated same-job chains (decreasing equipment).
  ranked.push(...(SUBSTITUTIONS[id] ?? []))

  // 4. Same kind + shared primary muscle, best overlap first.
  const self = EXERCISES[id]
  if (self) {
    const mine = new Set(musclesFor(id).primary)
    const scored = Object.values(EXERCISES)
      .filter((e) => e.id !== id && e.kind === self.kind)
      .map((e) => ({
        id: e.id,
        overlap: musclesFor(e.id).primary.filter((m) => mine.has(m)).length,
      }))
      .filter((s) => s.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
    ranked.push(...scored.map((s) => s.id))
  }

  const a = athleticFor(id)
  const out: string[] = []
  for (const cand of ranked) {
    if (cand === id || out.includes(cand) || taken.has(cand)) continue
    const def = EXERCISES[cand]
    if (!def) continue
    if (!canDo(cand, owned)) continue
    // An athletic drill keeps its movement kind unless the athletic
    // library itself vouches for the sub, sprints never become easy
    // cardio, jumps never become lifts. The curated chains cross kinds
    // on purpose (generation-time equipment fallback); swaps must not.
    if (a && self && def.kind !== self.kind && !qualitySubs.has(cand)) continue
    // A swapped-in athletic drill must never be harder than the original.
    const b = athleticFor(cand)
    if (a && b) {
      const order = { foundation: 0, intermediate: 1, advanced: 2 }
      if (order[b.level] > order[a.level]) continue
    }
    out.push(cand)
    if (out.length >= MAX_CANDIDATES) break
  }
  return out
}
