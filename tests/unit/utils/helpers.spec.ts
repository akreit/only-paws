import { describe, it, expect, vi } from 'vitest'
import {
  calculateDistance,
  calculateAverageRating,
  debounce,
  throttle,
  parseAmenities,
  stringifyAmenities,
  generateSlug,
} from '~/utils/helpers'

describe('calculateDistance', () => {
  it('returns 0 for same coordinates', () => {
    expect(calculateDistance(40.7128, -74.006, 40.7128, -74.006)).toBe(0)
  })

  it('calculates distance between two points', () => {
    // NYC to LA is approximately 3944 km
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437)
    expect(distance).toBeGreaterThan(3900)
    expect(distance).toBeLessThan(4000)
  })
})

describe('calculateAverageRating', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverageRating([])).toBe(0)
  })

  it('calculates average correctly', () => {
    expect(calculateAverageRating([4, 5, 3])).toBe(4)
  })

  it('handles single rating', () => {
    expect(calculateAverageRating([5])).toBe(5)
  })
})

describe('debounce', () => {
  it('delays function execution', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('resets timer on subsequent calls', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced()
    vi.advanceTimersByTime(200)
    debounced()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('throttle', () => {
  it('executes immediately on first call', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const throttled = throttle(fn, 300)

    throttled()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('blocks subsequent calls within limit', () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const throttled = throttle(fn, 300)

    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(300)
    throttled()
    expect(fn).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })
})

describe('parseAmenities', () => {
  it('returns empty array for undefined', () => {
    expect(parseAmenities(undefined)).toEqual([])
  })

  it('returns empty array for empty string', () => {
    expect(parseAmenities('')).toEqual([])
  })

  it('parses valid JSON string', () => {
    expect(parseAmenities('["Water bowls","Shade"]')).toEqual(['Water bowls', 'Shade'])
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseAmenities('not json')).toEqual([])
  })
})

describe('stringifyAmenities', () => {
  it('converts array to JSON string', () => {
    expect(stringifyAmenities(['Water bowls', 'Shade'])).toBe('["Water bowls","Shade"]')
  })
})

describe('generateSlug', () => {
  it('converts text to slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(generateSlug('Dog-Friendly Café!')).toBe('dog-friendly-caf')
  })

  it('collapses multiple dashes', () => {
    expect(generateSlug('hello   world')).toBe('hello-world')
  })
})
