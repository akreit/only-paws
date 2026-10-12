import { describe, expect, it } from 'vitest'
import { parseReviewUpdate } from '#server/utils/review-update'

describe('parseReviewUpdate', () => {
  it.each([null, undefined, 'x', 4, [1]])('rejects a non-object body (%j)', (body) => {
    expect(parseReviewUpdate(body)).toEqual({ error: 'Invalid input' })
  })

  it('requires at least one field', () => {
    expect(parseReviewUpdate({})).toEqual({ error: 'At least one field to update is required' })
  })

  it('rejects fields other than rating and comment', () => {
    expect(parseReviewUpdate({ rating: 3, authorId: 'u2', locationId: 'l2' })).toEqual({
      error: 'Fields cannot be updated: authorId, locationId',
    })
  })

  it.each([0, 6, 2.5, '4', null, NaN])('rejects the rating %j', (rating) => {
    expect(parseReviewUpdate({ rating })).toEqual({
      error: 'Rating must be an integer between 1 and 5',
    })
  })

  it.each([1, 3, 5])('accepts the rating %i', (rating) => {
    expect(parseReviewUpdate({ rating })).toEqual({ data: { rating } })
  })

  it('trims comments and turns empty ones into null', () => {
    expect(parseReviewUpdate({ comment: '  Lovely  ' })).toEqual({ data: { comment: 'Lovely' } })
    expect(parseReviewUpdate({ comment: '   ' })).toEqual({ data: { comment: null } })
    expect(parseReviewUpdate({ comment: null })).toEqual({ data: { comment: null } })
  })

  it('rejects non-string and too long comments', () => {
    expect(parseReviewUpdate({ comment: 5 })).toEqual({
      error: 'Comment must be a string or null',
    })
    expect(parseReviewUpdate({ comment: 'a'.repeat(2001) })).toEqual({
      error: 'Comment must be at most 2000 characters',
    })
    expect(parseReviewUpdate({ comment: 'a'.repeat(2000) })).toHaveProperty('data')
  })

  it('accepts rating and comment together', () => {
    expect(parseReviewUpdate({ rating: 4, comment: 'Good' })).toEqual({
      data: { rating: 4, comment: 'Good' },
    })
  })
})
