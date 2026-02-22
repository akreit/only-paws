<template>
  <div class="flex items-center gap-1">
    <button
      v-for="star in props.max"
      :key="star"
      type="button"
      :disabled="readonly"
      :class="starClasses()"
      @click="handleClick(star)"
      @mouseenter="handleMouseEnter(star)"
      @mouseleave="handleMouseLeave"
    >
      <svg :class="starIconClasses(star)" fill="currentColor" viewBox="0 0 20 20">
        <path
          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
        />
      </svg>
    </button>
    <span v-if="showValue" class="ml-2 text-sm text-gray-600">
      {{ modelValue ? modelValue.toFixed(1) : '0.0' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RatingProps } from '~/types'

interface Props extends RatingProps {
  showValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  max: 5,
  readonly: false,
  showValue: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const hoverRating = ref(0)

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

function starClasses() {
  const base = 'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
  const interactive = !props.readonly
    ? 'cursor-pointer hover:scale-110 transform'
    : 'cursor-default'
  return `${base} ${interactive}`
}

function starIconClasses(star: number) {
  const activeRating = hoverRating.value || props.modelValue
  const isActive = star <= activeRating
  const color = isActive ? 'text-yellow-400' : 'text-gray-300'
  return `${sizes[props.size]} ${color} transition-colors`
}

function handleClick(rating: number) {
  if (!props.readonly) {
    emit('update:modelValue', rating)
  }
}

function handleMouseEnter(rating: number) {
  if (!props.readonly) {
    hoverRating.value = rating
  }
}

function handleMouseLeave() {
  if (!props.readonly) {
    hoverRating.value = 0
  }
}
</script>
