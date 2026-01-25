<template>
  <div :class="containerClasses">
    <svg :class="spinnerClasses" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
    <p v-if="text" :class="textClasses">{{ text }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  text: undefined,
  fullScreen: false,
})

const containerClasses = computed(() => {
  const base = 'flex flex-col items-center justify-center'
  const fullScreen = props.fullScreen ? 'fixed inset-0 bg-white bg-opacity-75 z-50' : ''
  return `${base} ${fullScreen}`
})

const spinnerClasses = computed(() => {
  const base = 'animate-spin text-blue-600'
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }
  return `${base} ${sizes[props.size]}`
})

const textClasses = computed(() => {
  const sizes = {
    sm: 'text-sm mt-2',
    md: 'text-base mt-3',
    lg: 'text-lg mt-4',
  }
  return `text-gray-600 ${sizes[props.size]}`
})
</script>
