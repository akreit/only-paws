import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'only-paws:geolocation:v1'
const DAY = 24 * 60 * 60 * 1000

describe('geolocation-preference', () => {
  // The in-memory fallback is module-level, so load a fresh copy per test
  async function freshPreference() {
    vi.resetModules()
    return import('~/utils/geolocation-preference')
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts with nothing asked and no position', async () => {
    const pref = await freshPreference()
    expect(pref.hasAskedForLocation()).toBe(false)
    expect(pref.getLastPosition()).toBeNull()
  })

  it('persists the ask flag and last position under one key', async () => {
    const pref = await freshPreference()
    pref.markAskedForLocation()
    pref.saveLastPosition({ lat: 1, lng: 2 })

    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      asked: true,
      lastPosition: { lat: 1, lng: 2, at: Date.now() },
    })
    // survives a reload
    const reloaded = await freshPreference()
    expect(reloaded.hasAskedForLocation()).toBe(true)
    expect(reloaded.getLastPosition()).toEqual({ lat: 1, lng: 2, at: Date.now() })
  })

  it('keeps the flag when saving a position and vice versa', async () => {
    const pref = await freshPreference()
    pref.saveLastPosition({ lat: 1, lng: 2 })
    pref.markAskedForLocation()
    expect(pref.getLastPosition()).toMatchObject({ lat: 1, lng: 2 })
  })

  it('drops positions older than the max age', async () => {
    const pref = await freshPreference()
    pref.saveLastPosition({ lat: 1, lng: 2 })

    vi.setSystemTime(Date.now() + 0.9 * DAY)
    expect(pref.getLastPosition()).not.toBeNull()
    vi.setSystemTime(Date.now() + 0.2 * DAY)
    expect(pref.getLastPosition()).toBeNull()
    expect(pref.getLastPosition(10 * DAY)).not.toBeNull()
  })

  it('uses a versioned storage key', () => {
    expect(KEY).toBe('only-paws:geolocation:v1')
  })

  it('rounds stored coordinates to 3 decimals', async () => {
    const pref = await freshPreference()
    pref.saveLastPosition({ lat: 12.97164, lng: -77.59466 })

    expect(pref.getLastPosition()).toEqual({ lat: 12.972, lng: -77.595, at: Date.now() })
  })

  it('clearLastPosition drops the position but keeps the ask flag', async () => {
    const pref = await freshPreference()
    pref.markAskedForLocation()
    pref.saveLastPosition({ lat: 1, lng: 2 })

    pref.clearLastPosition()

    expect(pref.getLastPosition()).toBeNull()
    expect(pref.hasAskedForLocation()).toBe(true)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ asked: true, lastPosition: null })
  })

  it('ignores corrupt or malformed stored data', async () => {
    const pref = await freshPreference()
    localStorage.setItem(KEY, '{nope')
    expect(pref.hasAskedForLocation()).toBe(false)

    localStorage.setItem(KEY, JSON.stringify({ asked: 'yes', lastPosition: { lat: 'x' } }))
    expect(pref.hasAskedForLocation()).toBe(false)
    expect(pref.getLastPosition()).toBeNull()

    localStorage.setItem(
      KEY,
      JSON.stringify({ asked: true, lastPosition: { lat: 100, lng: 0, at: Date.now() } })
    )
    expect(pref.getLastPosition()).toBeNull()
  })

  it('falls back to memory when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    const pref = await freshPreference()

    expect(() => pref.markAskedForLocation()).not.toThrow()
    expect(() => pref.saveLastPosition({ lat: 1, lng: 2 })).not.toThrow()
  })

  it('works without localStorage at all (SSR)', async () => {
    vi.stubGlobal('localStorage', undefined)
    const pref = await freshPreference()

    expect(pref.hasAskedForLocation()).toBe(false)
    pref.markAskedForLocation()
    expect(pref.hasAskedForLocation()).toBe(true)
  })

  describe('shouldAutoLocate', () => {
    it.each([
      ['granted', false, true],
      ['granted', true, true],
      ['denied', false, false],
      ['denied', true, false],
      ['prompt', false, true],
      ['prompt', true, false],
      ['unknown', false, true],
      ['unknown', true, false],
    ] as const)('%s, asked=%s -> %s', async (state, asked, expected) => {
      const { shouldAutoLocate } = await freshPreference()
      expect(shouldAutoLocate(state, asked)).toBe(expected)
    })
  })

  describe('queryGeolocationPermission', () => {
    it('returns the Permissions API state', async () => {
      const query = vi.fn().mockResolvedValue({ state: 'granted' })
      vi.stubGlobal('navigator', { permissions: { query } })
      const { queryGeolocationPermission } = await freshPreference()

      await expect(queryGeolocationPermission()).resolves.toBe('granted')
      expect(query).toHaveBeenCalledWith({ name: 'geolocation' })
    })

    it('is unknown when the API is missing or rejects', async () => {
      const { queryGeolocationPermission } = await freshPreference()

      vi.stubGlobal('navigator', {})
      await expect(queryGeolocationPermission()).resolves.toBe('unknown')

      vi.stubGlobal('navigator', {
        permissions: { query: vi.fn().mockRejectedValue(new TypeError('bad name')) },
      })
      await expect(queryGeolocationPermission()).resolves.toBe('unknown')
    })
  })

  it('measures distances in meters', async () => {
    const { distanceMeters } = await freshPreference()
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(0)
    // 0.001 degrees of latitude is about 111 m
    expect(distanceMeters({ lat: 10, lng: 20 }, { lat: 10.001, lng: 20 })).toBeCloseTo(111, 0)
  })
})
