<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <div
      v-if="lockBasicFields && !showBasicInfoSection"
      class="rounded-xl bg-blue-50 p-4 text-sm text-blue-900"
    >
      <p class="font-semibold text-blue-950">{{ form.name }}</p>
      <p class="mt-1">
        Google Maps details will be saved automatically. Add dog-friendly info, an optional review,
        and photos below.
      </p>
    </div>

    <div v-if="showBasicInfoSection" class="space-y-6">
      <div v-if="lockBasicFields" class="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        We filled in the basic place details from Google Maps. Add the dog-friendly details below
        before saving.
      </div>

      <!-- Name -->
      <Input
        v-model="form.name"
        label="Name"
        placeholder="e.g., Central Park Dog Run"
        required
        :error="errors.name"
        :disabled="lockBasicFields"
      />

      <!-- Type -->
      <Select
        v-model="form.type"
        label="Type"
        :options="typeOptions"
        placeholder="Select location type"
        required
        :error="errors.type"
        :disabled="lockBasicFields"
      />

      <!-- Address -->
      <Input
        v-model="form.address"
        label="Address"
        placeholder="123 Main St, City, State"
        required
        :error="errors.address"
        :hint="addressHint"
        :disabled="lockBasicFields"
      />

      <!-- Coordinates -->
      <div class="grid grid-cols-2 gap-4">
        <Input
          v-model="form.latitude"
          type="number"
          label="Latitude"
          placeholder="40.7128"
          required
          :error="errors.latitude"
          step="any"
          :disabled="lockBasicFields"
        />
        <Input
          v-model="form.longitude"
          type="number"
          label="Longitude"
          placeholder="-74.0060"
          required
          :error="errors.longitude"
          step="any"
          :disabled="lockBasicFields"
        />
      </div>

      <Button
        v-if="!lockBasicFields"
        type="button"
        variant="outline"
        size="sm"
        :loading="geocoding"
        @click="geocodeAddress"
      >
        Find Coordinates from Address
      </Button>

      <!-- Description -->
      <div v-if="!lockBasicFields">
        <label class="mb-1 block text-sm font-medium text-gray-700"> Description (Optional) </label>
        <textarea
          v-model="form.description"
          rows="3"
          placeholder="Describe this location..."
          class="block w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <!-- Website & Phone -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          v-model="form.website"
          type="url"
          label="Website"
          placeholder="https://example.com"
          :error="errors.website"
          :disabled="lockBasicFields"
        />
        <Input
          v-model="form.phone"
          type="tel"
          label="Phone"
          placeholder="(555) 123-4567"
          :error="errors.phone"
          :disabled="lockBasicFields"
        />
      </div>

      <!-- Hours -->
      <Input
        v-model="form.hours"
        label="Hours"
        placeholder="Mon-Fri: 9AM-5PM, Sat-Sun: 10AM-6PM"
        :disabled="lockBasicFields"
      />
    </div>

    <!-- Dog Features -->
    <div :class="showBasicInfoSection ? 'border-t pt-6' : ''">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">🐕 Dog-Friendly Features</h3>

      <div class="space-y-4">
        <!-- Leash Required -->
        <div class="flex items-center gap-2">
          <input
            id="leashRequired"
            v-model="form.leashRequired"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="leashRequired" class="text-sm font-medium text-gray-700">
            Leash Required
          </label>
        </div>

        <!-- Off-Leash Area -->
        <div class="flex items-center gap-2">
          <input
            id="offLeashArea"
            v-model="form.offLeashArea"
            type="checkbox"
            class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label for="offLeashArea" class="text-sm font-medium text-gray-700">
            Has Off-Leash Area
          </label>
        </div>

        <!-- Breed Restrictions -->
        <Input
          v-model="form.breedRestrictions"
          label="Breed Restrictions (if any)"
          placeholder="e.g., No aggressive breeds"
        />

        <!-- Amenities -->
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Amenities (Select all that apply)
          </label>
          <div class="grid grid-cols-2 gap-2">
            <div
              v-for="amenity in AMENITIES_OPTIONS"
              :key="amenity"
              class="flex items-center gap-2"
            >
              <input
                :id="`amenity-${amenity}`"
                v-model="form.amenities"
                :value="amenity"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label :for="`amenity-${amenity}`" class="text-sm text-gray-700">
                {{ amenity }}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Review -->
    <div class="border-t pt-6">
      <h3 class="mb-4 text-lg font-semibold text-gray-900">📝 Quick Review (Optional)</h3>

      <div class="space-y-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-gray-700">
            Rating <span class="text-gray-400">(optional)</span>
          </label>
          <Rating v-model="reviewRating" :readonly="false" />
          <p v-if="errors.reviewRating" class="mt-1 text-sm text-red-600">
            {{ errors.reviewRating }}
          </p>
          <p v-else class="mt-1 text-sm text-gray-500">
            Add a rating if you want to save the note below as a review.
          </p>
        </div>

        <div>
          <label for="quick-review" class="mb-1 block text-sm font-medium text-gray-700">
            Review / Notes
          </label>
          <textarea
            id="quick-review"
            v-model="reviewComment"
            rows="4"
            placeholder="Share a quick impression, tip, or dog-friendly note..."
            class="block w-full rounded-lg border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
    </div>

    <!-- Photo Upload -->
    <div class="border-t pt-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">📸 Photos (Optional)</h3>
          <p class="mt-1 text-sm text-gray-500">
            Upload one or more photos now, or add them later from the location page.
          </p>
        </div>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="hidden"
          @change="handlePhotoSelect"
        />
        <Button type="button" variant="outline" @click="fileInput?.click()"> Choose Photos </Button>
      </div>

      <div v-if="selectedPhotos.length > 0" class="mt-4 space-y-2">
        <div
          v-for="(photo, index) in selectedPhotos"
          :key="`${photo.name}-${photo.size}-${index}`"
          class="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <div class="min-w-0">
            <p class="truncate font-medium text-gray-900">{{ photo.name }}</p>
            <p class="text-gray-500">{{ formatFileSize(photo.size) }}</p>
          </div>
          <button
            type="button"
            class="ml-3 text-sm font-medium text-red-600 hover:text-red-700"
            @click="removeSelectedPhoto(index)"
          >
            Remove
          </button>
        </div>
      </div>

      <div v-if="uploadProgress > 0 && uploadProgress < 100" class="mt-4">
        <div class="h-2 w-full rounded-full bg-gray-200">
          <div
            class="h-2 rounded-full bg-blue-600 transition-all"
            :style="{ width: `${uploadProgress}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="flex justify-end gap-3 border-t pt-6">
      <Button type="submit" variant="primary" :loading="isSubmitting" :disabled="!isFormValid">
        Add Location
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CreateLocationInput, Location, LocationType } from '~/types'
import { LOCATION_TYPE_LABELS, AMENITIES_OPTIONS, MAX_PHOTO_SIZE_MB } from '~/utils/constants'
import {
  validateUrl,
  validatePhone,
  validateCoordinates,
  validateRating,
  validateRequiredString,
} from '~/utils/validation'
import { useLocations } from '~/composables/useLocations'
import { useMap } from '~/composables/useMap'
import { useReviews } from '~/composables/useReviews'
import { usePhotos } from '~/composables/usePhotos'
import { useNotificationsStore } from '~/stores/notifications'
import Input from '~/components/ui/Input.vue'
import Button from '~/components/ui/Button.vue'
import Select from '~/components/ui/Select.vue'
import Rating from '~/components/ui/Rating.vue'

interface Props {
  initialLocation?: Partial<CreateLocationInput>
  lockBasicFields?: boolean
  showBasicInfoSection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  initialLocation: () => ({}),
  lockBasicFields: false,
  showBasicInfoSection: true,
})

const emit = defineEmits<{
  submitted: [location: Location]
}>()

const { createLocation, loading } = useLocations()
const { createReview, loading: reviewLoading } = useReviews()
const { uploadPhoto, loading: photoLoading, uploadProgress } = usePhotos()
const { geocodeAddress: geocode } = useMap()
const notifications = useNotificationsStore()

const form = ref(createInitialFormState())

const errors = ref<Record<string, string>>({})
const geocoding = ref(false)
const reviewRating = ref(0)
const reviewComment = ref('')
const selectedPhotos = ref<File[]>([])
const fileInput = ref<HTMLInputElement>()

const typeOptions = computed(() => {
  return Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }))
})

const addressHint = computed(() => {
  return props.lockBasicFields
    ? 'Imported from Google Maps'
    : "Click 'Find Coordinates' after entering the address"
})

const isFormValid = computed(() => {
  return (
    validateRequiredString(form.value.name) &&
    form.value.type &&
    validateRequiredString(form.value.address) &&
    form.value.latitude &&
    form.value.longitude
  )
})

const isSubmitting = computed(() => {
  return loading.value || reviewLoading.value || photoLoading.value
})

watch(
  () => props.initialLocation,
  () => {
    form.value = createInitialFormState()
    errors.value = {}
    reviewRating.value = 0
    reviewComment.value = ''
    selectedPhotos.value = []
  },
  { deep: true }
)

function createInitialFormState() {
  return {
    name: props.initialLocation.name || '',
    type: (props.initialLocation.type as LocationType | undefined) || ('' as LocationType | ''),
    description: props.initialLocation.description || '',
    address: props.initialLocation.address || '',
    latitude:
      props.initialLocation.latitude !== undefined ? props.initialLocation.latitude.toString() : '',
    longitude:
      props.initialLocation.longitude !== undefined
        ? props.initialLocation.longitude.toString()
        : '',
    website: props.initialLocation.website || '',
    phone: props.initialLocation.phone || '',
    hours: props.initialLocation.hours || '',
    leashRequired: props.initialLocation.leashRequired || false,
    breedRestrictions: props.initialLocation.breedRestrictions || '',
    offLeashArea: props.initialLocation.offLeashArea || false,
    amenities: props.initialLocation.amenities ? [...props.initialLocation.amenities] : [],
  }
}

async function geocodeAddress() {
  if (!form.value.address) {
    notifications.error('Please enter an address first')
    return
  }

  geocoding.value = true
  try {
    const coords = await geocode(form.value.address)
    if (coords) {
      form.value.latitude = coords.lat.toString()
      form.value.longitude = coords.lng.toString()
      notifications.success('Coordinates found!')
    } else {
      notifications.error('Could not find coordinates for this address')
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    notifications.error('Failed to find coordinates')
  } finally {
    geocoding.value = false
  }
}

function handlePhotoSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])

  if (!files.length) return

  const maxSizeBytes = MAX_PHOTO_SIZE_MB * 1024 * 1024
  const validFiles = files.filter((file) => {
    if (!file.type.startsWith('image/')) {
      notifications.error(`${file.name} is not an image file`)
      return false
    }

    if (file.size > maxSizeBytes) {
      notifications.error(`${file.name} must be smaller than ${MAX_PHOTO_SIZE_MB}MB`)
      return false
    }

    return true
  })

  selectedPhotos.value = [...selectedPhotos.value, ...validFiles]

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function removeSelectedPhoto(index: number) {
  selectedPhotos.value.splice(index, 1)
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

async function handleSubmit() {
  errors.value = {}

  // Validation
  if (!validateRequiredString(form.value.name)) {
    errors.value.name = 'Name is required'
  }

  if (!form.value.type) {
    errors.value.type = 'Type is required'
  }

  if (!validateRequiredString(form.value.address)) {
    errors.value.address = 'Address is required'
  }

  const lat = parseFloat(form.value.latitude)
  const lng = parseFloat(form.value.longitude)

  if (!validateCoordinates(lat, lng)) {
    errors.value.latitude = 'Invalid coordinates'
    errors.value.longitude = 'Invalid coordinates'
  }

  if (form.value.website && !validateUrl(form.value.website)) {
    errors.value.website = 'Invalid URL'
  }

  if (form.value.phone && !validatePhone(form.value.phone)) {
    errors.value.phone = 'Invalid phone number'
  }

  const hasReviewContent = validateRequiredString(reviewComment.value) || reviewRating.value > 0
  if (hasReviewContent && !validateRating(reviewRating.value)) {
    errors.value.reviewRating = 'Please add a rating to save your review'
  }

  if (Object.keys(errors.value).length > 0) {
    return
  }

  // Prepare input
  const input: CreateLocationInput = {
    googlePlaceId: props.initialLocation.googlePlaceId,
    name: form.value.name,
    type: form.value.type as LocationType,
    address: form.value.address,
    latitude: lat,
    longitude: lng,
    description: form.value.description || undefined,
    website: form.value.website || undefined,
    phone: form.value.phone || undefined,
    hours: form.value.hours || undefined,
    leashRequired: form.value.leashRequired,
    breedRestrictions: form.value.breedRestrictions || undefined,
    offLeashArea: form.value.offLeashArea,
    amenities: form.value.amenities,
  }

  try {
    const location = await createLocation(input)

    const extras = await Promise.allSettled([
      hasReviewContent
        ? createReview({
            locationId: location.id,
            rating: reviewRating.value,
            comment: reviewComment.value || undefined,
          })
        : Promise.resolve(null),
      ...selectedPhotos.value.map((photo) => uploadPhoto(photo, location.id)),
    ])

    const failedExtras = extras.filter((result) => result.status === 'rejected')
    if (failedExtras.length > 0) {
      notifications.warning(
        'Location added, but some optional review or photo uploads could not be saved.'
      )
    }

    emit('submitted', location)
  } catch (error) {
    console.error('Failed to create location:', error)
  }
}
</script>
