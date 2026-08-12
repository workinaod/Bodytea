import type { ISODate, MealEntry } from '../types'
import { DEFAULT_SUPPLEMENTS } from '../types'
import { uid, useAppStore } from '../store/appStore'
import { nutritionDayType } from '../engine/resolveDay'

// ============================================================
// Food logging, split out of logic/actions.ts. The meal day is
// a self-contained corner of the store: entries, supplements,
// and the training/rest override that drives the targets.
// Nothing here touches sessions, so it does not belong in the
// same file as the session lifecycle.
// ============================================================

const store = () => useAppStore.getState()

function ensureMealDay(date: ISODate): void {
  store().update((d) => {
    if (!d.meals[date]) {
      d.meals[date] = { date, entries: [], supplements: { ...DEFAULT_SUPPLEMENTS } }
    }
  })
}

export function addMealEntry(
  date: ISODate,
  entry: Omit<MealEntry, 'id' | 'at' | 'servings'> & { servings?: number },
): void {
  ensureMealDay(date)
  store().update((d) => {
    d.meals[date].entries.push({
      ...entry,
      id: uid(),
      at: new Date().toISOString(),
      servings: entry.servings ?? 1,
    })
  })
}

export function setMealServings(date: ISODate, entryId: string, servings: number): void {
  store().update((d) => {
    const e = d.meals[date]?.entries.find((x) => x.id === entryId)
    if (e) e.servings = Math.max(0.5, servings)
  })
}

export function removeMealEntry(date: ISODate, entryId: string): void {
  store().update((d) => {
    const day = d.meals[date]
    if (day) day.entries = day.entries.filter((x) => x.id !== entryId)
  })
}

export function toggleSupplement(date: ISODate, id: keyof typeof DEFAULT_SUPPLEMENTS): void {
  ensureMealDay(date)
  store().update((d) => {
    d.meals[date].supplements[id] = !d.meals[date].supplements[id]
  })
}

export function cycleDayTypeOverride(date: ISODate): void {
  ensureMealDay(date)
  store().update((d) => {
    const day = d.meals[date]
    day.dayTypeOverride =
      day.dayTypeOverride === undefined ? 'training' : day.dayTypeOverride === 'training' ? 'rest' : undefined
  })
}

export function nutritionTargets(date: ISODate) {
  const data = store().data
  const dayType = nutritionDayType(date, data)
  return { dayType }
}
