<template>
  <Modal :model-value="modelValue" title="Edit place" size="lg" @update:model-value="close">
    <form id="edit-location-form" class="space-y-6" @submit.prevent="handleSubmit">
      <Select v-model="form.type" label="Type" :options="typeOptions" required />

      <div class="border-t pt-6">
        <h3 class="mb-4 text-lg font-semibold text-gray-900">🐕 Dog-Friendly Features</h3>
        <DogFeaturesFields
          v-model:leash-required="form.leashRequired"
          v-model:off-leash-area="form.offLeashArea"
          v-model:breed-restrictions="form.breedRestrictions"
          v-model:amenities="form.amenities"
        />
      </div>
    </form>

    <template #footer>
      <Button type="button" variant="outline" @click="close">Cancel</Button>
      <Button type="submit" form="edit-location-form" variant="primary" :loading="saving">
        Save
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Location, LocationType, UpdateLocationInput } from '~/types'
import { LOCATION_TYPE_LABELS } from '~/utils/constants'
import { parseAmenities } from '~/utils/helpers'
import Modal from '~/components/ui/Modal.vue'
import Select from '~/components/ui/Select.vue'
import Button from '~/components/ui/Button.vue'
import DogFeaturesFields from '~/components/location/DogFeaturesFields.vue'

interface Props {
  modelValue: boolean
  location: Location
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  updated: [location: Location]
}>()

const { updateLocation } = useLocations()

const saving = ref(false)
const form = ref(createFormState())

const typeOptions = computed(() =>
  Object.entries(LOCATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))
)

// Start from the stored values every time the dialog opens, so cancelling discards edits
watch(
  () => props.modelValue,
  (open) => {
    if (open) form.value = createFormState()
  }
)

function createFormState() {
  return {
    type: props.location.type as LocationType,
    leashRequired: props.location.leashRequired ?? false,
    offLeashArea: props.location.offLeashArea ?? false,
    breedRestrictions: props.location.breedRestrictions ?? '',
    amenities: parseAmenities(props.location.amenities),
  }
}

function close() {
  emit('update:modelValue', false)
}

// Only send what changed, so untouched "unknown" (null) features are not overwritten with false
function buildChanges(): UpdateLocationInput {
  const initial = createFormState()
  const changes: UpdateLocationInput = {}

  if (form.value.type !== initial.type) changes.type = form.value.type
  if (form.value.leashRequired !== initial.leashRequired) {
    changes.leashRequired = form.value.leashRequired
  }
  if (form.value.offLeashArea !== initial.offLeashArea) {
    changes.offLeashArea = form.value.offLeashArea
  }
  if (form.value.breedRestrictions.trim() !== initial.breedRestrictions.trim()) {
    changes.breedRestrictions = form.value.breedRestrictions.trim() || null
  }
  if (
    JSON.stringify([...form.value.amenities].sort()) !==
    JSON.stringify([...initial.amenities].sort())
  ) {
    changes.amenities = form.value.amenities
  }

  return changes
}

async function handleSubmit() {
  const changes = buildChanges()

  if (Object.keys(changes).length === 0) {
    close()
    return
  }

  saving.value = true
  try {
    const updated = await updateLocation(props.location.id, changes)
    emit('updated', updated)
    close()
  } catch (error) {
    console.error('Failed to update location:', error)
  } finally {
    saving.value = false
  }
}
</script>
