<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      :required="required"
      :class="selectClasses"
      options=""
      @change="handleChange"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-sm text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SelectProps } from '~/types'

const props = withDefaults(defineProps<SelectProps>(), {
  id: undefined,
  modelValue: undefined,
  label: undefined,
  placeholder: undefined,
  disabled: false,
  required: false,
  error: undefined,
  hint: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectClasses = computed(() => {
  const base =
    'block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm transition-colors'
  const state = props.error
    ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
  const disabled = props.disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'

  return `${base} ${state} ${disabled}`
})

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>
