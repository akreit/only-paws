import type { Transition as VueTransition } from 'vue'

declare global {
  const Transition: typeof VueTransition
}

export {}
