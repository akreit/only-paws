<template>
  <div class="bg-white rounded-lg border border-gray-200 p-6">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>

    <form @submit.prevent="handleSubmit">
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Rating <span class="text-red-500">*</span>
        </label>
        <Rating v-model="rating" :readonly="false" show-value />
        <p v-if="errors.rating" class="mt-1 text-sm text-red-600">{{ errors.rating }}</p>
      </div>

      <div class="mb-4">
        <label for="comment" class="block text-sm font-medium text-gray-700 mb-1">
          Comment (Optional)
        </label>
        <textarea
          id="comment"
          v-model="comment"
          rows="4"
          placeholder="Share your experience..."
          class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div class="flex justify-end gap-3">
        <Button
          v-if="onCancel"
          type="button"
          variant="outline"
          @click="onCancel"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          :loading="loading"
          :disabled="!isValid"
        >
          Submit Review
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CreateReviewInput } from '~/types'
import { validateRating } from '~/utils/validation'

interface Props {
  locationId: string
  onCancel?: () => void
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submitted: []
}>()

const { createReview, loading } = useReviews()

const rating = ref(0)
const comment = ref('')
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

  const input: CreateReviewInput = {
    locationId: props.locationId,
    rating: rating.value,
    comment: comment.value || undefined,
  }

  try {
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

