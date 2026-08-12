import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { badgeSupported, clearBadge, deliveryNote, setBadge, showNotification } from './notifications'

// ============================================================
// The badge contract, which is what the stuck "1" violated.
//
// The old rule was "a session is scheduled and unfinished", which is a
// workout flag, not a message count: the user saw a red 1 with nothing
// behind it to read, and because it only re-evaluated while the app was
// open it could never clear itself from a closed app.
// ============================================================

const calls: { set: number[]; cleared: number } = { set: [], cleared: 0 }

beforeEach(() => {
  calls.set = []
  calls.cleared = 0
  vi.stubGlobal('navigator', {
    setAppBadge: (n?: number) => {
      calls.set.push(n ?? 0)
      return Promise.resolve()
    },
    clearAppBadge: () => {
      calls.cleared++
      return Promise.resolve()
    },
    serviceWorker: { getRegistration: () => Promise.resolve(undefined) },
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('badge', () => {
  it('shows a count, and zero means clear rather than a zero badge', async () => {
    await setBadge(3)
    expect(calls.set).toEqual([3])
    expect(calls.cleared).toBe(0)

    await setBadge(0)
    expect(calls.set).toEqual([3])
    expect(calls.cleared).toBe(1)
  })

  it('clearBadge always clears', async () => {
    await clearBadge()
    expect(calls.cleared).toBe(1)
  })

  it('survives a platform with no badge support', async () => {
    vi.stubGlobal('navigator', {})
    expect(badgeSupported()).toBe(false)
    await expect(setBadge(2)).resolves.toBeUndefined()
    await expect(clearBadge()).resolves.toBeUndefined()
  })
})

describe('delivery', () => {
  it('reports failure when nothing was actually shown', async () => {
    // No permission and no registration: the caller must learn that no
    // message exists, so it never raises a badge for one.
    vi.stubGlobal('Notification', { permission: 'default' })
    expect(await showNotification('Title', 'Body', 'tag')).toBe(false)
  })

  it('reports failure when permission is denied', async () => {
    vi.stubGlobal('Notification', { permission: 'denied' })
    expect(await showNotification('Title', 'Body', 'tag')).toBe(false)
  })

  it('reports success only when the registration accepted it', async () => {
    const shown: string[] = []
    vi.stubGlobal('Notification', { permission: 'granted' })
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: () =>
          Promise.resolve({
            showNotification: (title: string) => {
              shown.push(title)
              return Promise.resolve()
            },
          }),
      },
    })
    expect(await showNotification('Session open', 'Body', 'tag')).toBe(true)
    expect(shown).toEqual(['BodyT · Session open'])
  })
})

describe('honesty about delivery', () => {
  it('every capability has a sentence a user can act on', () => {
    expect(deliveryNote('push')).toMatch(/open or not/)
    // The iPhone case: say the limit instead of pretending the switch works
    expect(deliveryNote('foreground-only')).toMatch(/only delivers while BodyT is open/)
    expect(deliveryNote('periodic-sync')).toMatch(/background/)
    expect(deliveryNote('none')).toMatch(/cannot/)
  })
})
