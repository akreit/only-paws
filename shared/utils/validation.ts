export const MAX_REVIEW_COMMENT_LENGTH = 2000

export function validateRating(rating: unknown): rating is number {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
}
