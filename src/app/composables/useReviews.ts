import type { CreateReviewInput, Review, UpdateReviewInput } from '~/types'
import { markLocationsChanged } from '~/utils/locations-cache'

export function useReviews() {
  const notifications = useNotificationsStore()
  const loading = ref(false)

  async function createReview(input: CreateReviewInput) {
    loading.value = true

    try {
      const review = await $fetch<Review>('/api/reviews', {
        method: 'POST',
        body: input,
      })

      markLocationsChanged()
      notifications.success('Review submitted successfully!')
      return review
    } catch (error) {
      notifications.error('Failed to submit review')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateReview(id: string, input: UpdateReviewInput) {
    loading.value = true

    try {
      const review = await $fetch<Review>(`/api/reviews/${id}`, {
        method: 'PATCH',
        body: input,
      })

      markLocationsChanged()
      notifications.success('Review updated successfully!')
      return review
    } catch (error) {
      notifications.error('Failed to update review')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteReview(id: string) {
    loading.value = true

    try {
      await $fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
      })

      markLocationsChanged()
      notifications.success('Review deleted successfully!')
    } catch (error) {
      notifications.error('Failed to delete review')
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    createReview,
    updateReview,
    deleteReview,
  }
}
