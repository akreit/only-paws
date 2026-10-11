import { afterEach, describe, expect, it, vi } from 'vitest'
import { shouldPreloadOnIdle } from '~/utils/network'

describe('shouldPreloadOnIdle', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('allows preloading when the Network Information API is missing', () => {
    vi.stubGlobal('navigator', {})
    expect(shouldPreloadOnIdle()).toBe(true)
  })

  it.each([
    [{ effectiveType: '4g' }, true],
    [{ effectiveType: '3g' }, true],
    [{ saveData: false }, true],
    [{ saveData: true, effectiveType: '4g' }, false],
    [{ effectiveType: '2g' }, false],
    [{ effectiveType: 'slow-2g' }, false],
  ])('connection %j -> %s', (connection, expected) => {
    expect(shouldPreloadOnIdle(connection)).toBe(expected)
  })

  it('reads navigator.connection by default', () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } })
    expect(shouldPreloadOnIdle()).toBe(false)
  })
})
