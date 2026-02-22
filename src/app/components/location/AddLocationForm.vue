<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Name -->
    <Input
      v-model="form.name"
      label="Name"
      placeholder="e.g., Central Park Dog Run"
      required
      :error="errors.name"
    />

    <!-- Type -->
    <Select
      v-model="form.type"
      label="Type"
      :options="typeOptions"
      placeholder="Select location type"
      required
      :error="errors.type"
    />

    <!-- Address -->
    <Input
      v-model="form.address"
      label="Address"
      placeholder="123 Main St, City, State"
      required
      :error="errors.address"
      hint="Click 'Find Coordinates' after entering the address"
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
      />
      <Input
        v-model="form.longitude"
        type="number"
        label="Longitude"
        placeholder="-74.0060"
        required
        :error="errors.longitude"
        step="any"
      />
    </div>

    <Button type="button" variant="outline" size="sm" :loading="geocoding" @click="geocodeAddress">
      Find Coordinates from Address
    </Button>

    <!-- Description -->
    <div>
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
      />
      <Input
        v-model="form.phone"
        type="tel"
        label="Phone"
        placeholder="(555) 123-4567"
        :error="errors.phone"
      />
    </div>

    <!-- Hours -->
    <Input v-model="form.hours" label="Hours" placeholder="Mon-Fri: 9AM-5PM, Sat-Sun: 10AM-6PM" />

    <!-- Dog Features -->
    <div class="border-t pt-6">
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

    <!-- Submit Button -->
    <div class="flex justify-end gap-3 border-t pt-6">
      <Button type="submit" variant="primary" :loading="loading" :disabled="!isFormValid">
        Add Location
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CreateLocationInput, LocationType } from '~/types'
import { LOCATION_TYPE_LABELS, AMENITIES_OPTIONS } from '~/utils/constants'
import {
  validateUrl,
  validatePhone,
  validateCoordinates,
  validateRequiredString,
} from '~/utils/validation'
import { useLocations } from '~/composables/useLocations'
import { useMap } from '~/composables/useMap'
import { useNotificationsStore } from '~/stores/notifications'
import Input from '~/components/ui/Input.vue'
import Button from '~/components/ui/Button.vue'
import Select from '~/components/ui/Select.vue'

const emit = defineEmits<{
  submitted: []
}>()

const { createLocation, loading } = useLocations()
const { geocodeAddress: geocode } = useMap()
const notifications = useNotificationsStore()

const form = ref({
  name: '',
  type: '' as LocationType | '',
  description: '',
  address: '',
  latitude: '',
  longitude: '',
  website: '',
  phone: '',
  hours: '',
  leashRequired: false,
  breedRestrictions: '',
  offLeashArea: false,
  amenities: [] as string[],
})

const errors = ref<Record<string, string>>({})
const geocoding = ref(false)

const typeOptions = computed(() => {
  return Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }))
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

  if (Object.keys(errors.value).length > 0) {
    return
  }

  // Prepare input
  const input: CreateLocationInput = {
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
    await createLocation(input)
    emit('submitted')
  } catch (error) {
    console.error('Failed to create location:', error)
  }
}
</script>
