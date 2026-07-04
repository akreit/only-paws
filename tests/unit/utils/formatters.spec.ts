import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatDistance,
  formatRating,
  formatPhoneNumber,
  truncateText,
  pluralize,
} from '~/utils/formatters'

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    const result = formatDate(date)
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('formats a date string', () => {
    const result = formatDate('2024-01-01T00:00:00Z')
    expect(result).toContain('2024')
  })
})

describe('formatDateTime', () => {
  it('formats a date with time', () => {
    const date = new Date('2024-06-15T14:30:00Z')
    const result = formatDateTime(date)
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })
})

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent dates', () => {
    const now = new Date()
    expect(formatRelativeTime(now)).toBe('just now')
  })

  it('returns minutes ago for recent dates', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000)
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago')
  })

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000)
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago')
  })

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
    expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago')
  })

  it('returns formatted date for older dates', () => {
    const oldDate = new Date(Date.now() - 30 * 86400000)
    const result = formatRelativeTime(oldDate)
    expect(result).not.toContain('ago')
  })

  it('handles singular forms', () => {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60000)
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago')
  })
})

describe('formatDistance', () => {
  it('formats meters for short distances', () => {
    expect(formatDistance(500)).toBe('500 m')
  })

  it('formats kilometers for longer distances', () => {
    expect(formatDistance(2500)).toBe('2.5 km')
  })

  it('rounds meters', () => {
    expect(formatDistance(123.7)).toBe('124 m')
  })
})

describe('formatRating', () => {
  it('formats rating to one decimal', () => {
    expect(formatRating(4.5)).toBe('4.5')
    expect(formatRating(3)).toBe('3.0')
  })
})

describe('formatPhoneNumber', () => {
  it('formats a 10-digit phone number', () => {
    expect(formatPhoneNumber('2125551234')).toBe('(212) 555-1234')
  })

  it('returns original string for non-standard numbers', () => {
    expect(formatPhoneNumber('+44 20 7946 0958')).toBe('+44 20 7946 0958')
  })
})

describe('truncateText', () => {
  it('does not truncate short text', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('truncates long text with ellipsis', () => {
    expect(truncateText('hello world', 5)).toBe('hello...')
  })
})

describe('pluralize', () => {
  it('returns singular for count 1', () => {
    expect(pluralize(1, 'dog')).toBe('dog')
  })

  it('returns default plural for count != 1', () => {
    expect(pluralize(3, 'dog')).toBe('dogs')
  })

  it('uses custom plural form', () => {
    expect(pluralize(2, 'puppy', 'puppies')).toBe('puppies')
  })
})
