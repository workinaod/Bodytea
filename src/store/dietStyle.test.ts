import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildNaodPreset } from '../plan/presets/naod'
import { serializeState } from './backup'
import { planConfigSchema } from './schema'
import { emptyAppData, type DietStyle } from '../types'
import { parseEnvelope } from './backup'

// ============================================================
// The wipe.
//
// A pescatarian picked "Fish, no meat" in onboarding, the generator wrote
// dietStyle: 'pescatarian' onto their plan, and the state saved without
// complaint because saving does not validate. The next time they opened
// the app, hydrate() ran the envelope through migrate(), the plan schema
// listed three diet styles instead of four, validation threw, and the
// catch parked their state under naod.state.corrupt and returned an empty
// app. Onboarding again. Every session, measurement and photo reference
// gone from view.
//
// One word in an enum, and only for the diet style nobody on the team ate.
// So this file does not hold a copy of the list. EVERY_DIET_STYLE is typed
// as Record<DietStyle, ...>, which means adding a style to the union and
// not to this file stops the build, and the loop below then proves the
// round trip for whatever the union currently contains.
// ============================================================

const EVERY_DIET_STYLE: Record<DietStyle, true> = {
  omnivore: true,
  vegetarian: true,
  vegan: true,
  pescatarian: true,
}

const STYLES = Object.keys(EVERY_DIET_STYLE) as DietStyle[]

describe('every diet style survives a save and a reload', () => {
  it.each(STYLES)('%s passes plan validation', (dietStyle) => {
    const parsed = planConfigSchema.safeParse({ ...buildNaodPreset(), dietStyle })
    const issues = parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    expect(issues).toEqual([])
  })

  it.each(STYLES)('%s survives the full envelope round trip', (dietStyle) => {
    const data = emptyAppData('2026-01-05', '2026-01-05', { ...buildNaodPreset(), dietStyle })
    // The exact path hydrate() takes on launch: serialize, then parse the
    // string back through migrate. This is what threw.
    const restored = parseEnvelope(serializeState(data)).data
    expect(restored.plan?.dietStyle).toBe(dietStyle)
  })
})

// ============================================================
// Recovery for anyone the wipe already hit.
//
// Their real state is sitting in naod.state.corrupt, parked by the failed
// load and then never looked at again. Once the schema accepts their diet
// style, the parked copy parses, so hydrate adopts it in place of the empty
// state nobody has onboarded into yet.
// ============================================================

describe('a parked state comes back once it validates again', () => {
  const KEY = 'naod.state'
  const store = new Map<string, string>()

  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    vi.resetModules()
  })
  afterEach(() => vi.unstubAllGlobals())

  const realState = () => {
    const d = emptyAppData('2026-01-05', '2026-01-05', { ...buildNaodPreset(), dietStyle: 'pescatarian' as DietStyle })
    d.settings.onboarded = true
    d.measurements = [{ date: '2026-02-01', weightLb: 181, photoIds: {} }]
    return d
  }

  it('adopts the parked copy instead of the empty app', async () => {
    store.set(`${KEY}.corrupt`, serializeState(realState()))
    const { useAppStore } = await import('./appStore')
    const loaded = useAppStore.getState().data
    expect(loaded.settings.onboarded).toBe(true)
    expect(loaded.measurements).toHaveLength(1)
    expect(loaded.plan?.dietStyle).toBe('pescatarian')
    expect(store.get(`${KEY}.corrupt`)).toBeUndefined()
  })

  it('never overwrites a state the athlete is already using', async () => {
    const parked = realState()
    parked.measurements = [{ date: '2020-01-01', weightLb: 999, photoIds: {} }]
    store.set(`${KEY}.corrupt`, serializeState(parked))
    const live = realState()
    live.measurements = [{ date: '2026-08-01', weightLb: 175, photoIds: {} }]
    store.set(KEY, serializeState(live))
    const { useAppStore } = await import('./appStore')
    expect(useAppStore.getState().data.measurements[0]?.weightLb).toBe(175)
    expect(store.get(`${KEY}.corrupt`)).toBeDefined()
  })
})
