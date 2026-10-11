/** Include used wherever locations are listed (map, favorites, profile). */
export const LOCATION_LIST_INCLUDE = {
  photos: {
    take: 1,
    orderBy: { createdAt: 'desc' },
  },
  reviews: true,
  _count: {
    select: {
      reviews: true,
      photos: true,
      favorites: true,
    },
  },
} as const

/** Include for a single place's detail view (GET and PATCH /api/locations/[id]). */
export const LOCATION_DETAIL_INCLUDE = {
  photos: {
    include: {
      uploader: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  reviews: {
    include: {
      author: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  _count: {
    select: {
      reviews: true,
      photos: true,
      favorites: true,
    },
  },
} as const

export function withAverageRating<T extends { reviews?: Array<{ rating: number }> | null }>(
  location: T
) {
  const reviews = location.reviews ?? []
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0

  return { ...location, averageRating }
}
