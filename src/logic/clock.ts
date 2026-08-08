import { useSyncExternalStore } from 'react'
import type { ISODate } from '../types'
import { todayISO } from '../engine/calendar'
import { msUntilNextMidnight } from '../engine/rollover'

// ============================================================
// The live clock: a tiny external store holding the current
// local date. A midnight-aimed timeout, a 30s safety interval
// (catches sleep/wake, timer throttling, clock changes), and
// visibility/focus/pageshow listeners all funnel into one
// check; subscribers re-render only when the DAY changes.
// ============================================================

let currentToday: ISODate = todayISO()
const listeners = new Set<() => void>()
let midnightTimer: ReturnType<typeof setTimeout> | null = null
let safetyInterval: ReturnType<typeof setInterval> | null = null
let onDayChangeCb: (() => void) | null = null
let started = false

function armMidnightTimer(): void {
  if (midnightTimer) clearTimeout(midnightTimer)
  midnightTimer = setTimeout(check, msUntilNextMidnight(new Date()))
}

function check(): void {
  const real = todayISO()
  if (real !== currentToday) {
    currentToday = real
    for (const l of listeners) l()
    onDayChangeCb?.()
  }
  armMidnightTimer()
}

/** Idempotent. Call once from App; safe under StrictMode double-mount. */
export function startClock(onDayChange?: () => void): void {
  onDayChangeCb = onDayChange ?? onDayChangeCb
  if (started) return
  started = true
  armMidnightTimer()
  safetyInterval = setInterval(check, 30_000)
  const onWake = () => check()
  document.addEventListener('visibilitychange', onWake)
  window.addEventListener('focus', onWake)
  window.addEventListener('pageshow', onWake)
}

/** Test/HMR hygiene. */
export function stopClock(): void {
  started = false
  onDayChangeCb = null
  if (midnightTimer) clearTimeout(midnightTimer)
  if (safetyInterval) clearInterval(safetyInterval)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): ISODate {
  return currentToday
}

/** The current local date, re-rendering the component when the day changes. */
export function useToday(): ISODate {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
