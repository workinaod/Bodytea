import { describe, expect, it } from 'vitest'
import {
  decideAdoption,
  derivePassword,
  derivePasswordV1,
  derivePasswordV2,
  emailFor,
  isPristine,
  isTrivialPin,
  normalizePhone,
  pinProblem,
  validNewPin,
  validPinForSignIn,
  validUsername,
} from './logic'
import { emptyAppData, type MealDay, type SessionLog } from '../types'

describe('credential derivation', () => {
  it('v1 is FROZEN, this vector must never change', async () => {
    // Accounts that have not signed in since the v2 upgrade still
    // authenticate with this exact string. Changing it locks them out.
    expect(await derivePasswordV1('15551234567', '123456')).toBe(
      '886ebac92902049adf0f3ac083a8371222565ff712eb9eff93dda2a937f9adeb',
    )
  })

  it('v2 is FROZEN too, and is what new accounts get', async () => {
    const v2 = await derivePasswordV2('15551234567', '123456')
    expect(v2).toBe(await derivePassword('15551234567', '123456'))
    expect(v2).toHaveLength(64)
    expect(v2).toMatch(/^[0-9a-f]+$/)
    // Stretched and salted, so it cannot coincide with the v1 digest
    expect(v2).not.toBe(await derivePasswordV1('15551234567', '123456'))
  })

  it('v2 salts per account, so two users sharing a PIN differ', async () => {
    expect(await derivePasswordV2('15551234567', '481902')).not.toBe(
      await derivePasswordV2('15559999999', '481902'),
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

  it('username rules', () => {
    expect(validUsername('naod_23')).toBe(true)
    expect(validUsername('ab')).toBe(false)
    expect(validUsername('Has-Caps')).toBe(false)
  })

  it('signing in still accepts the old 4-digit PINs', () => {
    // Existing accounts must not be locked out by the new floor.
    expect(validPinForSignIn('1234')).toBe(true)
    expect(validPinForSignIn('48190275')).toBe(true)
    expect(validPinForSignIn('123')).toBe(false)
    expect(validPinForSignIn('12a456')).toBe(false)
  })

  it('setting a PIN demands six digits and some imagination', () => {
    expect(validNewPin('481902')).toBe(true)
    expect(validNewPin('1234')).toBe(false) // too short now
    expect(validNewPin('12a456')).toBe(false)
  })

  it('rejects the PINs an attacker guesses first', () => {
    for (const pin of [
      '000000', // all one digit
      '111111',
      '123456', // runs, both directions
      '987654',
      '123123', // repeated block
      '696969',
      '1212',
      '1999', // birth years
      '2024',
    ]) {
      expect(isTrivialPin(pin), pin).toBe(true)
    }
    for (const pin of ['481902', '735018', '90210754']) {
      expect(isTrivialPin(pin), pin).toBe(false)
    }
  })

  it('says why a PIN was refused, in words', () => {
    expect(pinProblem('481902')).toBeNull()
    expect(pinProblem('1234')).toMatch(/6 to 8 digits/)
    expect(pinProblem('123456')).toMatch(/guess/)
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
