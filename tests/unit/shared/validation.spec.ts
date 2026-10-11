import { describe, it, expect } from 'vitest'
import { MAX_REVIEW_COMMENT_LENGTH, validateRating } from '#shared/utils/validation'

describe('validateRating', () => {
  it.each([1, 3, 5])('accepts %i', (rating) => {
    expect(validateRating(rating)).toBe(true)
  })

  it.each([0, 6, 3.5, NaN, '4', null, undefined])('rejects %j', (rating) => {
    expect(validateRating(rating)).toBe(false)
  })
})

describe('MAX_REVIEW_COMMENT_LENGTH', () => {
  it('is 2000', () => {
    expect(MAX_REVIEW_COMMENT_LENGTH).toBe(2000)
  })
})
