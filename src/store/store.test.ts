import { describe, expect, it } from 'vitest'
import { emptyAppData } from '../types'
import { buildExport, parseEnvelope, serializeState } from './backup'

function fixtureData() {
  const data = emptyAppData('2026-08-10')
  data.settings.onboarded = true
  data.sessions['2026-08-10'] = {
    date: '2026-08-10',
    templateId: 'monday',
    status: 'completed',
    readiness: { flags: [false, false, false, false], downgraded: false },
    exercises: [
      { exerciseId: 'box-jump', sets: [{ targetReps: '3', reps: 3, done: true }] },
      { exerciseId: 'goblet-squat', sets: [{ targetReps: '6-8', weightLb: 80, reps: 8, done: true }] },
    ],
  }
  data.excuses.push({
    id: 'x1',
    at: '2026-08-11T10:00:00.000Z',
    date: '2026-08-11',
    scope: 'day',
    action: 'skip',
    reason: 'busy',
    proofPhotoId: 'p1',
    accepted: true,
    minimumViableTaken: false,
    escalationLevelAtTime: 0,
  })
  data.photos.push({ id: 'p1', kind: 'proof', takenAt: '2026-08-11T09:00:00.000Z', w: 100, h: 100, bytes: 1234 })
  data.meals['2026-08-10'] = {
    date: '2026-08-10',
    entries: [
      { id: 'm1', at: '2026-08-10T12:00:00.000Z', label: 'Chicken + rice', proteinG: 60, kcal: 750, source: 'mealTemplate', servings: 1 },
    ],
    supplements: { creatine: true, fishOil: false, vitD3: true, electrolytes: false },
  }
  data.measurements.push({ date: '2026-08-16', weightLb: 197, waistIn: 36, photoIds: { front: 'p1' } })
  data.coach.feed.push({ id: 'c1', at: '2026-08-10T18:00:00.000Z', kind: 'coach', situation: 'session-done', text: 'Work banked.' })
  data.coach.shownMessageIds.push('session-done:0')
  data.coach.surfacedInsights['recomp-waist'] = '2026-08-16'
  return data
}

describe('backup round trip', () => {
  it('serialize → parse yields deep-equal data', () => {
    const data = fixtureData()
    const raw = serializeState(data)
    const parsed = parseEnvelope(raw)
    expect(parsed.data).toEqual(data)
  })

  it('full export inlines photo blobs and round-trips', async () => {
    const data = fixtureData()
    const env = await buildExport(data, true, async (id) => (id === 'p1' ? 'aGVsbG8=' : null))
    expect(env.photoBlobs).toEqual({ p1: 'aGVsbG8=' })
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.data).toEqual(data)
    expect(parsed.photoBlobs).toEqual({ p1: 'aGVsbG8=' })
  })

  it('data-only export omits blobs', async () => {
    const env = await buildExport(fixtureData(), false, async () => 'nope')
    expect(env.photoBlobs).toBeUndefined()
  })
})

describe('migrations', () => {
  it('upgrades a v1 backup (no reminder settings) to the current schema', () => {
    const env = JSON.parse(serializeState(fixtureData())) as {
      schemaVersion: number
      data: { settings: Record<string, unknown> }
    }
    env.schemaVersion = 1
    delete env.data.settings.remindersEnabled
    delete env.data.settings.reminderTimes
    const parsed = parseEnvelope(JSON.stringify(env))
    expect(parsed.schemaVersion).toBe(2)
    expect(parsed.data.settings.remindersEnabled).toBe(false)
    expect(parsed.data.settings.reminderTimes).toEqual(['11:30', '17:30', '20:30'])
  })
})

describe('import validation', () => {
  it('rejects non-JSON', () => {
    expect(() => parseEnvelope('not json')).toThrow(/not valid JSON/)
  })

  it('rejects JSON that is not a backup', () => {
    expect(() => parseEnvelope('{"hello":"world"}')).toThrow(/schema version/i)
  })

  it('rejects newer schema versions with a clear message', () => {
    const env = { ...JSON.parse(serializeState(fixtureData())), schemaVersion: 99 }
    expect(() => parseEnvelope(JSON.stringify(env))).toThrow(/newer app version/)
  })

  it('rejects structurally broken data with a path', () => {
    const env = JSON.parse(serializeState(fixtureData()))
    env.data.sessions['2026-08-10'].status = 'exploded'
    expect(() => parseEnvelope(JSON.stringify(env))).toThrow(/sessions/)
  })
})
