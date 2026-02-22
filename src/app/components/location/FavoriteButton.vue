<template>
  <button :disabled="loading" :class="buttonClasses" @click="handleClick">
    <svg :class="iconClasses" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
    <span v-if="showLabel">{{ isFavorite ? 'Saved' : 'Save' }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  locationId: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  showLabel: false,
  size: 'md',
})

const { isFavorite: checkIsFavorite, toggleFavorite, loading } = useFavorites()

const isFavorite = computed(() => checkIsFavorite(props.locationId))

const buttonClasses = computed(() => {
  const base =
    'inline-flex items-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50'
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }
  const state = isFavorite.value
    ? 'text-red-500 bg-red-50 hover:bg-red-100'
    : 'text-gray-600 bg-gray-50 hover:bg-gray-100'

  return `${base} ${sizes[props.size]} ${state}`
})

const iconClasses = computed(() => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }
  const fill = isFavorite.value ? 'fill-current' : ''
  return `${sizes[props.size]} ${fill}`
})

async function handleClick() {
  await toggleFavorite(props.locationId)
}
</script>
