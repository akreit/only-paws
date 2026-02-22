<template>
  <div class="rounded-lg bg-white p-6 shadow-md">
    <h3 class="mb-4 text-lg font-semibold text-gray-900">📸 Photos</h3>

    <!-- Upload Button -->
    <div v-if="isSignedIn" class="mb-6">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />
      <Button
        variant="outline"
        :disabled="uploading"
        :loading="uploading"
        @click="fileInput?.click()"
      >
        <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        Upload Photo
      </Button>

      <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mt-2">
        <div class="h-2 w-full rounded-full bg-gray-200">
          <div
            class="h-2 rounded-full bg-blue-600 transition-all"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Photos Grid -->
    <div v-if="photos.length > 0" class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-opacity hover:opacity-90"
        @click="openLightbox(photo)"
      >
        <img
          :src="photo.url"
          :alt="photo.caption || 'Location photo'"
          class="h-full w-full object-cover"
        />
      </div>
    </div>

    <div v-else class="py-12 text-center text-gray-500">
      <svg
        class="mx-auto mb-3 h-16 w-16 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <p>No photos yet</p>
      <p v-if="isSignedIn" class="mt-1 text-sm">Be the first to add photos!</p>
    </div>

    <!-- Lightbox -->
    <Modal v-model="showLightbox" size="xl" :closable="true">
      <div v-if="selectedPhoto" class="space-y-4">
        <img
          :src="selectedPhoto.url"
          :alt="selectedPhoto.caption || 'Location photo'"
          class="w-full rounded-lg"
        />
        <div v-if="selectedPhoto.caption" class="text-gray-700">
          {{ selectedPhoto.caption }}
        </div>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <div class="flex items-center gap-2">
            <img
              v-if="selectedPhoto.uploader?.avatarUrl"
              :src="selectedPhoto.uploader.avatarUrl"
              :alt="selectedPhoto.uploader.username || 'User'"
              class="h-6 w-6 rounded-full"
            />
            <span>{{ selectedPhoto.uploader?.username || 'Anonymous' }}</span>
          </div>
          <span>{{ formatRelativeTime(selectedPhoto.createdAt) }}</span>
        </div>

        <Button
          v-if="canDelete(selectedPhoto)"
          variant="danger"
          size="sm"
          @click="handleDeletePhoto"
        >
          Delete Photo
        </Button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Photo } from '~/types'
import { formatRelativeTime } from '~/utils/formatters'
import { MAX_PHOTO_SIZE_MB } from '~/utils/constants'

interface Props {
  locationId: string
  photos: Photo[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'photo-uploaded': []
  'photo-deleted': []
}>()

const { isSignedIn } = useAuth()
const { user } = useUser()
const { uploadPhoto, deletePhoto, loading: uploading, uploadProgress } = usePhotos()
const notifications = useNotificationsStore()

const fileInput = ref<HTMLInputElement>()
const showLightbox = ref(false)
const selectedPhoto = ref<Photo | null>(null)

function openLightbox(photo: Photo) {
  selectedPhoto.value = photo
  showLightbox.value = true
}

function canDelete(photo: Photo) {
  return user.value?.id === photo.uploaderId
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  // Validate file size
  const maxSizeBytes = MAX_PHOTO_SIZE_MB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    notifications.error(`File size must be less than ${MAX_PHOTO_SIZE_MB}MB`)
    return
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    notifications.error('Please select an image file')
    return
  }

  try {
    await uploadPhoto(file, props.locationId)
    emit('photo-uploaded')

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    console.error('Failed to upload photo:', error)
  }
}

async function handleDeletePhoto() {
  if (!selectedPhoto.value) return

  if (confirm('Are you sure you want to delete this photo?')) {
    try {
      await deletePhoto(selectedPhoto.value.id, selectedPhoto.value.publicId)
      showLightbox.value = false
      selectedPhoto.value = null
      emit('photo-deleted')
    } catch (error) {
      console.error('Failed to delete photo:', error)
    }
  }
}
</script>
