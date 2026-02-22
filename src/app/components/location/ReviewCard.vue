<template>
  <div class="rounded-lg border border-gray-200 bg-white p-4">
    <div class="mb-3 flex items-start justify-between">
      <div class="flex items-start gap-3">
        <img
          v-if="review.author?.avatarUrl"
          :src="review.author.avatarUrl"
          :alt="review.author.username || 'User'"
          class="h-10 w-10 rounded-full"
        />
        <div v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
          <svg class="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clip-rule="evenodd"
            />
          </svg>
        </div>

        <div>
          <p class="font-medium text-gray-900">
            {{ review.author?.username || 'Anonymous' }}
          </p>
          <p class="text-sm text-gray-500">
            {{ formatRelativeTime(review.createdAt) }}
          </p>
        </div>
      </div>

      <button
        v-if="canDelete"
        class="text-gray-400 transition-colors hover:text-red-600"
        @click="handleDelete"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>

    <Rating :model-value="review.rating" :readonly="true" size="sm" class="mb-2" />

    <p v-if="review.comment" class="text-gray-700">
      {{ review.comment }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Review } from '~/types'
import { formatRelativeTime } from '~/utils/formatters'

interface Props {
  review: Review
}

const props = defineProps<Props>()
const emit = defineEmits<{
  delete: []
}>()

const { user } = useAuthSync()
const { deleteReview } = useReviews()

const canDelete = computed(() => {
  return user.value?.id === props.review.authorId
})

async function handleDelete() {
  if (confirm('Are you sure you want to delete this review?')) {
    try {
      await deleteReview(props.review.id)
      emit('delete')
    } catch (error) {
      console.error('Failed to delete review:', error)
    }
  }
}
</script>
