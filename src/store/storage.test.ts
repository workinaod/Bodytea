import { describe, expect, it, vi } from 'vitest'
import { LocalStorageDriver, STATE_KEY, isQuotaError, validateProofFile } from './storage'

/** A localStorage stand-in whose setItem can be told to blow up. */
function fakeStorage(onSet?: () => void) {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      onSet?.()
      map.set(k, v)
    },
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage
}

function withStorage<T>(s: Storage, fn: () => T): T {
  const real = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true })
  try {
    return fn()
  } finally {
    if (real) Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true })
  }
}

describe('a write that does not land says so', () => {
  it('reports success on a normal write', () => {
    withStorage(fakeStorage(), () => {
      expect(new LocalStorageDriver().save('{"a":1}')).toBe(true)
    })
  })

  it('reports FAILURE when the disk is full instead of swallowing it', () => {
    // This is the whole point: the old driver returned void here, logged to
    // a console no phone user can open, and let the app carry on believing
    // the session was on disk. Everything logged after would vanish on the
    // next reload, with no warning at any point.
    const quota = Object.assign(new Error('quota'), { name: 'QuotaExceededError' })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    withStorage(
      fakeStorage(() => {
        throw quota
      }),
      () => {
        expect(new LocalStorageDriver().save('{"a":1}')).toBe(false)
      },
    )
    spy.mockRestore()
  })

  it('survives localStorage being unavailable entirely', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    withStorage(
      fakeStorage(() => {
        throw new DOMException('denied', 'SecurityError')
      }),
      () => {
        const d = new LocalStorageDriver()
        expect(d.save('x')).toBe(false)
        expect(d.load()).toBe(null)
      },
    )
    spy.mockRestore()
  })

  it('round-trips through the real key', () => {
    withStorage(fakeStorage(), () => {
      const d = new LocalStorageDriver()
      d.save('payload')
      expect(localStorage.getItem(STATE_KEY)).toBe('payload')
      expect(d.load()).toBe('payload')
    })
  })
})

describe('isQuotaError knows the many names for a full disk', () => {
  it.each([
    ['QuotaExceededError', 0],
    ['NS_ERROR_DOM_QUOTA_REACHED', 0],
    ['SomeOtherName', 22],
    ['SomeOtherName', 1014],
  ])('%s / code %i', (name, code) => {
    expect(isQuotaError(Object.assign(new Error('e'), { name, code }))).toBe(true)
  })

  it('is not fooled by unrelated failures', () => {
    expect(isQuotaError(Object.assign(new Error('e'), { name: 'SecurityError', code: 18 }))).toBe(false)
    expect(isQuotaError('a string')).toBe(false)
    expect(isQuotaError(null)).toBe(false)
  })
})

describe('proof files', () => {
  it('rejects a non-image and a stale photo, accepts a fresh one', () => {
    expect(validateProofFile({ type: 'application/pdf' }).ok).toBe(false)
    expect(validateProofFile({ type: 'image/jpeg', lastModified: Date.now() }).ok).toBe(true)
    expect(
      validateProofFile({ type: 'image/jpeg', lastModified: Date.now() - 30 * 86400000 }).ok,
    ).toBe(false)
  })

  it('gives a file with no timestamp the benefit of the doubt', () => {
    expect(validateProofFile({ type: 'image/png' }).ok).toBe(true)
  })
})
