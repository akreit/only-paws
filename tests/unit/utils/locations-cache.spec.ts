import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'only-paws:locations-changed-at'

describe('locations-cache', () => {
  // The fallback variable is module-level, so load a fresh copy per test
  async function freshCache() {
    vi.resetModules()
    return import('~/utils/locations-cache')
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('has no cache bust until a change is marked', async () => {
    const { locationsCacheBust } = await freshCache()
    expect(locationsCacheBust()).toBeUndefined()
  })

  it('returns a fresh value for 90s after a change, then expires', async () => {
    const { markLocationsChanged, locationsCacheBust } = await freshCache()
    markLocationsChanged()

    expect(locationsCacheBust()).toBe(String(Date.now()))

    vi.setSystemTime(Date.now() + 89_000)
    expect(locationsCacheBust()).toBe(String(Date.now()))

    vi.setSystemTime(Date.now() + 2_000)
    expect(locationsCacheBust()).toBeUndefined()
  })

  it('persists the window in sessionStorage across module reloads', async () => {
    const first = await freshCache()
    first.markLocationsChanged()
    expect(sessionStorage.getItem(KEY)).toBe(String(Date.now()))

    const reloaded = await freshCache()
    expect(reloaded.locationsCacheBust()).toBe(String(Date.now()))
  })

  it('ignores a corrupt stored value', async () => {
    sessionStorage.setItem(KEY, 'nope')
    const { locationsCacheBust } = await freshCache()
    expect(locationsCacheBust()).toBeUndefined()
  })

  it('falls back to the module variable when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const { markLocationsChanged, locationsCacheBust } = await freshCache()

    expect(() => markLocationsChanged()).not.toThrow()
    expect(locationsCacheBust()).toBe(String(Date.now()))

    vi.setSystemTime(Date.now() + 91_000)
    expect(locationsCacheBust()).toBeUndefined()
  })

  it('falls back to the module variable when sessionStorage is missing', async () => {
    vi.stubGlobal('sessionStorage', undefined)
    try {
      const { markLocationsChanged, locationsCacheBust } = await freshCache()
      expect(locationsCacheBust()).toBeUndefined()
      expect(() => markLocationsChanged()).not.toThrow()
      expect(locationsCacheBust()).toBe(String(Date.now()))
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
