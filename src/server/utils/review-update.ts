export interface ReviewUpdateData {
  rating?: number
  comment?: string | null
}

export type ReviewUpdateResult = { data: ReviewUpdateData } | { error: string }

/** Validates a PATCH /api/reviews/[id] body without touching the database. */
export function parseReviewUpdate(body: unknown): ReviewUpdateResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid input' }
  }

  const input = body as Record<string, unknown>
  const unknownFields = Object.keys(input).filter((key) => key !== 'rating' && key !== 'comment')
  if (unknownFields.length > 0) {
    return { error: `Fields cannot be updated: ${unknownFields.join(', ')}` }
  }

  const data: ReviewUpdateData = {}

  if (input.rating !== undefined) {
    const { rating } = input
    if (!validateRating(rating)) {
      return { error: 'Rating must be an integer between 1 and 5' }
    }
    data.rating = rating
  }

  if (input.comment !== undefined) {
    const { comment } = input
    if (comment !== null && typeof comment !== 'string') {
      return { error: 'Comment must be a string or null' }
    }
    const trimmed = comment?.trim() ?? ''
    if (trimmed.length > MAX_REVIEW_COMMENT_LENGTH) {
      return { error: `Comment must be at most ${MAX_REVIEW_COMMENT_LENGTH} characters` }
    }
    data.comment = trimmed || null
  }

  if (Object.keys(data).length === 0) {
    return { error: 'At least one field to update is required' }
  }

  return { data }
}
