<template>
  <div class="space-y-4">
    <!-- Leash Required -->
    <div class="flex items-center gap-2">
      <input
        id="leashRequired"
        v-model="leashRequired"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label for="leashRequired" class="text-sm font-medium text-gray-700"> Leash Required </label>
    </div>

    <!-- Off-Leash Area -->
    <div class="flex items-center gap-2">
      <input
        id="offLeashArea"
        v-model="offLeashArea"
        type="checkbox"
        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label for="offLeashArea" class="text-sm font-medium text-gray-700">
        Has Off-Leash Area
      </label>
    </div>

    <!-- Breed Restrictions -->
    <Input
      v-model="breedRestrictions"
      label="Breed Restrictions (if any)"
      placeholder="e.g., No aggressive breeds"
    />

    <!-- Amenities -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700">
        Amenities (Select all that apply)
      </label>
      <div class="grid grid-cols-2 gap-2">
        <div v-for="amenity in amenityOptions" :key="amenity" class="flex items-center gap-2">
          <input
            :id="`amenity-${amenity}`"
            v-model="amenities"
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
</template>

<script setup lang="ts">
import Input from '~/components/ui/Input.vue'

const amenityOptions = AMENITIES_OPTIONS

const leashRequired = defineModel<boolean>('leashRequired', { default: false })
const offLeashArea = defineModel<boolean>('offLeashArea', { default: false })
const breedRestrictions = defineModel<string>('breedRestrictions', { default: '' })
const amenities = defineModel<string[]>('amenities', { default: () => [] })
</script>
