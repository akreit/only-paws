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

      <div v-if="canEdit && !editing" class="flex items-center gap-3">
        <button
          type="button"
          class="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
          data-testid="edit-review"
          @click="startEditing"
        >
          Edit
        </button>
        <button
          type="button"
          class="text-gray-400 transition-colors hover:text-red-600"
          aria-label="Delete review"
          data-testid="delete-review"
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
    </div>

    <form v-if="editing" class="space-y-3" @submit.prevent="handleSave">
      <div>
        <Rating v-model="draftRating" :readonly="false" show-value />
        <p v-if="ratingError" class="mt-1 text-sm text-red-600">{{ ratingError }}</p>
      </div>
      <textarea
        v-model="draftComment"
        rows="3"
        placeholder="Share your experience..."
        class="block w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
      />
      <div class="flex justify-end gap-3">
        <Button type="button" variant="outline" size="sm" @click="cancelEditing">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" :loading="loading">Save</Button>
      </div>
    </form>

    <template v-else>
      <Rating :model-value="review.rating" :readonly="true" size="sm" class="mb-2" />

      <p v-if="review.comment" class="text-gray-700">
        {{ review.comment }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Review } from '~/types'
import { formatRelativeTime } from '~/utils/formatters'
import { validateRating } from '~/utils/validation'
import Button from '~/components/ui/Button.vue'
import Rating from '~/components/ui/Rating.vue'

interface Props {
  review: Review
}

const props = defineProps<Props>()
const emit = defineEmits<{
  delete: []
  updated: [review: Review]
}>()

const userStore = useUserStore()
const user = computed(() => userStore.user)
const { updateReview, deleteReview, loading } = useReviews()

const editing = ref(false)
const draftRating = ref(0)
const draftComment = ref('')
const ratingError = ref('')

// Only the author may edit or delete; the API enforces the same rule
const canEdit = computed(() => {
  return !!user.value && user.value.id === props.review.authorId
})

function startEditing() {
  draftRating.value = props.review.rating
  draftComment.value = props.review.comment ?? ''
  ratingError.value = ''
  editing.value = true
}

function cancelEditing() {
  editing.value = false
}

async function handleSave() {
  if (!validateRating(draftRating.value)) {
    ratingError.value = 'Please select a rating'
    return
  }

  try {
    const updated = await updateReview(props.review.id, {
      rating: draftRating.value,
      comment: draftComment.value.trim() || null,
    })
    editing.value = false
    emit('updated', updated)
  } catch (error) {
    console.error('Failed to update review:', error)
  }
}

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
