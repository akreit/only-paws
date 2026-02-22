<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto"
        @click.self="handleBackdropClick"
      >
        <div class="flex min-h-screen items-center justify-center p-4">
          <TransitionChild
            enter="duration-300 ease-out"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100"
            leave-to="opacity-0"
            model-value
          >
            <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
          </TransitionChild>

          <TransitionChild
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
            model-value
          >
            <div :class="modalClasses" role="dialog" aria-modal="true" @click.stop>
              <div
                v-if="title || $slots.header"
                class="flex items-center justify-between border-b border-gray-200 p-6"
              >
                <slot name="header">
                  <h3 class="text-xl font-semibold text-gray-900">{{ title }}</h3>
                </slot>
                <button
                  v-if="closable"
                  type="button"
                  class="text-gray-400 hover:text-gray-500 focus:outline-none"
                  @click="close"
                >
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div class="p-6">
                <slot />
              </div>

              <div v-if="$slots.footer" class="flex justify-end gap-3 border-t border-gray-200 p-6">
                <slot name="footer" />
              </div>
            </div>
          </TransitionChild>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModalProps } from '~/types'

interface Props extends ModalProps {
  closable?: boolean
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closable: true,
  title: undefined,
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const modalClasses = computed(() => {
  const base = 'relative bg-white rounded-lg shadow-xl transform transition-all w-full'
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }
  return `${base} ${sizes[props.size]}`
})

function close() {
  emit('update:modelValue', false)
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    close()
  }
}

// Prevent body scroll when modal is open
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }
)
</script>

<script lang="ts">
// TransitionChild component for nested transitions
const TransitionChild = defineComponent({
  name: 'TransitionChild',
  inheritAttrs: false,
  setup(_, { attrs, slots }) {
    return () => h(Transition, attrs, slots)
  },
})
</script>
