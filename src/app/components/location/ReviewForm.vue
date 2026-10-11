<template>
  <div :class="isEdit ? '' : 'rounded-lg border border-gray-200 bg-white p-6'">
    <h3 v-if="!isEdit" class="mb-4 text-lg font-semibold text-gray-900">Write a Review</h3>

    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label v-if="!isEdit" class="mb-2 block text-sm font-medium text-gray-700">
          Rating <span class="text-red-500">*</span>
        </label>
        <Rating v-model="rating" :readonly="false" show-value />
        <p v-if="errors.rating" class="mt-1 text-sm text-red-600">{{ errors.rating }}</p>
      </div>

      <div class="mb-4">
        <label v-if="!isEdit" for="comment" class="mb-1 block text-sm font-medium text-gray-700">
          Comment (Optional)
        </label>
        <textarea
          :id="isEdit ? undefined : 'comment'"
          v-model="comment"
          :aria-label="isEdit ? 'Comment' : undefined"
          :rows="isEdit ? 3 : 4"
          :maxlength="maxCommentLength"
          placeholder="Share your experience..."
          class="block w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div class="flex justify-end gap-3">
        <Button v-if="isEdit" type="button" variant="outline" @click="emit('cancel')">
          Cancel
        </Button>
        <Button type="submit" variant="primary" :loading="loading" :disabled="!isValid">
          {{ isEdit ? 'Save' : 'Submit Review' }}
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { CreateReviewInput, Review } from '~/types'

interface Props {
  locationId?: string
  /** When set, the form edits this review instead of creating a new one */
  review?: Review
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submitted: []
  updated: [review: Review]
  cancel: []
}>()

const { createReview, updateReview, loading } = useReviews()

const maxCommentLength = MAX_REVIEW_COMMENT_LENGTH
const isEdit = computed(() => !!props.review)
const rating = ref(props.review?.rating ?? 0)
const comment = ref(props.review?.comment ?? '')
const errors = ref<{ rating?: string }>({})

const isValid = computed(() => {
  return rating.value > 0 && rating.value <= 5
})

async function handleSubmit() {
  errors.value = {}

  if (!validateRating(rating.value)) {
    errors.value.rating = 'Please select a rating'
    return
  }

  try {
    if (props.review) {
      const updated = await updateReview(props.review.id, {
        rating: rating.value,
        comment: comment.value.trim() || null,
      })
      emit('updated', updated)
      return
    }

    const input: CreateReviewInput = {
      locationId: props.locationId!,
      rating: rating.value,
      comment: comment.value || undefined,
    }
    await createReview(input)

    // Reset form
    rating.value = 0
    comment.value = ''

    emit('submitted')
  } catch (error) {
    console.error('Failed to submit review:', error)
  }
}
</script>
