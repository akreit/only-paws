import { describe, expect, it } from 'vitest'
import { LOCATION_LIST_INCLUDE, withAverageRating } from '#server/utils/location'

describe('LOCATION_LIST_INCLUDE', () => {
  it('includes the newest photo, reviews and counts', () => {
    expect(LOCATION_LIST_INCLUDE).toEqual({
      photos: { take: 1, orderBy: { createdAt: 'desc' } },
      reviews: true,
      _count: { select: { reviews: true, photos: true, favorites: true } },
    })
  })
})

describe('withAverageRating', () => {
  it('averages the review ratings and keeps the other fields', () => {
    const result = withAverageRating({ id: 'l1', reviews: [{ rating: 5 }, { rating: 4 }] })

    expect(result).toEqual({
      id: 'l1',
      reviews: [{ rating: 5 }, { rating: 4 }],
      averageRating: 4.5,
    })
  })

  it('is 0 without reviews', () => {
    expect(withAverageRating({ id: 'l1', reviews: [] }).averageRating).toBe(0)
    expect(withAverageRating({ id: 'l2' }).averageRating).toBe(0)
    expect(withAverageRating({ id: 'l3', reviews: null }).averageRating).toBe(0)
  })
})
