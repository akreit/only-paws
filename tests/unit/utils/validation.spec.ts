import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validateUrl,
  validatePhone,
  validateRating,
  validateCoordinates,
  validateRequiredString,
  validateStringLength,
  createValidationError,
} from '~/utils/validation'

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('test.user@domain.org')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('@domain.com')).toBe(false)
    expect(validateEmail('user@')).toBe(false)
  })
})

describe('validateUrl', () => {
  it('accepts valid URLs', () => {
    expect(validateUrl('https://example.com')).toBe(true)
    expect(validateUrl('http://localhost:3000')).toBe(true)
  })

  it('rejects invalid URLs', () => {
    expect(validateUrl('')).toBe(false)
    expect(validateUrl('not a url')).toBe(false)
  })
})

describe('validatePhone', () => {
  it('accepts valid phone numbers', () => {
    expect(validatePhone('2125551234')).toBe(true)
    expect(validatePhone('+1 (212) 555-1234')).toBe(true)
  })

  it('rejects invalid phone numbers', () => {
    expect(validatePhone('123')).toBe(false)
    expect(validatePhone('abcdefghij')).toBe(false)
  })
})

describe('validateRating', () => {
  it('accepts valid ratings', () => {
    expect(validateRating(1)).toBe(true)
    expect(validateRating(5)).toBe(true)
    expect(validateRating(3)).toBe(true)
  })

  it('rejects invalid ratings', () => {
    expect(validateRating(0)).toBe(false)
    expect(validateRating(6)).toBe(false)
    expect(validateRating(3.5)).toBe(false)
  })
})

describe('validateCoordinates', () => {
  it('accepts valid coordinates', () => {
    expect(validateCoordinates(40.7128, -74.006)).toBe(true)
    expect(validateCoordinates(0, 0)).toBe(true)
    expect(validateCoordinates(-90, 180)).toBe(true)
  })

  it('rejects invalid coordinates', () => {
    expect(validateCoordinates(91, 0)).toBe(false)
    expect(validateCoordinates(0, 181)).toBe(false)
    expect(validateCoordinates(-91, -181)).toBe(false)
  })
})

describe('validateRequiredString', () => {
  it('accepts non-empty strings', () => {
    expect(validateRequiredString('hello')).toBe(true)
  })

  it('rejects empty/undefined strings', () => {
    expect(validateRequiredString('')).toBe(false)
    expect(validateRequiredString(undefined)).toBe(false)
    expect(validateRequiredString('  ')).toBe(false)
  })

  it('respects minLength parameter', () => {
    expect(validateRequiredString('ab', 3)).toBe(false)
    expect(validateRequiredString('abc', 3)).toBe(true)
  })
})

describe('validateStringLength', () => {
  it('accepts strings within max length', () => {
    expect(validateStringLength('hello', 10)).toBe(true)
    expect(validateStringLength('hello', 5)).toBe(true)
  })

  it('rejects strings exceeding max length', () => {
    expect(validateStringLength('hello world', 5)).toBe(false)
  })
})

describe('createValidationError', () => {
  it('creates validation error object', () => {
    const error = createValidationError('email', 'Invalid email')
    expect(error).toEqual({ field: 'email', message: 'Invalid email' })
  })
})
