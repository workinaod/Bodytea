import { describe, expect, it } from 'vitest'
import {
  decideAdoption,
  derivePassword,
  emailFor,
  isPristine,
  normalizePhone,
  validPin,
  validUsername,
} from './logic'
import { emptyAppData, type MealDay, type SessionLog } from '../types'

describe('credential derivation', () => {
  it('derivePassword is FROZEN, this vector must never change', async () => {
    // Changing the formula would lock every existing account out.
    expect(await derivePassword('15551234567', '123456')).toBe(
      '886ebac92902049adf0f3ac083a8371222565ff712eb9eff93dda2a937f9adeb',
    )
  })

  it('synthetic email is derived from digits only', () => {
    expect(emailFor('15551234567')).toBe('p15551234567@pin.bodytea.app')
  })
})

describe('input validation', () => {
  it('normalizePhone strips formatting and bounds length', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('5551234567')
    expect(normalizePhone('+1 555 123 4567')).toBe('15551234567')
    expect(normalizePhone('12345')).toBeNull()
    expect(normalizePhone('1234567890123456')).toBeNull()
  })

  it('username and PIN rules', () => {
    expect(validUsername('naod_23')).toBe(true)
    expect(validUsername('ab')).toBe(false)
    expect(validUsername('Has-Caps')).toBe(false)
    expect(validPin('123456')).toBe(true)
    expect(validPin('123')).toBe(false)
    expect(validPin('12a456')).toBe(false)
  })
})

describe('first-login adoption', () => {
  it('pristine: not onboarded, or onboarded with zero history', () => {
    const fresh = emptyAppData('2026-08-10')
    expect(isPristine(fresh)).toBe(true)
    fresh.settings.onboarded = true
    expect(isPristine(fresh)).toBe(true)
    fresh.sessions['2026-08-10'] = {} as unknown as SessionLog
    expect(isPristine(fresh)).toBe(false)
  })

  it('meals alone also count as history', () => {
    const d = emptyAppData('2026-08-10')
    d.settings.onboarded = true
    d.meals['2026-08-10'] = {} as unknown as MealDay
    expect(isPristine(d)).toBe(false)
  })

  it('decides push / pull / conflict correctly', () => {
    // No remote row → this device seeds the cloud
    expect(decideAdoption({ localPristine: false, remoteExportedAt: null, metaLastRemoteExportedAt: null })).toBe('push')
    // Remote exists, local has nothing worth keeping → take the backup
    expect(decideAdoption({ localPristine: true, remoteExportedAt: 'T1', metaLastRemoteExportedAt: null })).toBe('pull')
    // Remote unchanged since this device last synced → keep going forward
    expect(decideAdoption({ localPristine: false, remoteExportedAt: 'T1', metaLastRemoteExportedAt: 'T1' })).toBe('push')
    // Both sides have real, diverged data → the user decides
    expect(decideAdoption({ localPristine: false, remoteExportedAt: 'T2', metaLastRemoteExportedAt: 'T1' })).toBe('conflict')
    expect(decideAdoption({ localPristine: false, remoteExportedAt: 'T2', metaLastRemoteExportedAt: null })).toBe('conflict')
  })
})
