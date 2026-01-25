import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '~/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  const loading = ref(false)

  function setUser(userData: User | null) {
    user.value = userData
  }

  function clearUser() {
    user.value = null
  }

  return {
    user,
    isAuthenticated,
    loading,
    setUser,
    clearUser,
  }
})


