<template>
  <button
    type="button"
    class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-wait"
    aria-label="Use my location"
    title="Use my location"
    :disabled="locating"
    :aria-busy="locating"
    @click="emit('locate')"
  >
    <LoadingSpinner v-if="locating" size="sm" />
    <svg
      v-else
      class="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'

defineProps<{ locating: boolean }>()
const emit = defineEmits<{ locate: [] }>()
</script>
