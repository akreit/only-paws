import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '~/types'

export const useUserStore = defineStore('user', () => {
  const profile = ref<User | null>(null)
  const favorites = ref<string[]>([])
  const loading = ref(false)

  function setProfile(user: User | null) {
    profile.value = user
  }

  function updateProfile(updates: Partial<User>) {
    if (profile.value) {
      profile.value = { ...profile.value, ...updates }
    }
  }

  function setFavorites(locationIds: string[]) {
    favorites.value = locationIds
  }

  function addFavorite(locationId: string) {
    if (!favorites.value.includes(locationId)) {
      favorites.value.push(locationId)
    }
  }

  function removeFavorite(locationId: string) {
    const index = favorites.value.indexOf(locationId)
    if (index !== -1) {
      favorites.value.splice(index, 1)
    }
  }

  function isFavorite(locationId: string): boolean {
    return favorites.value.includes(locationId)
  }

  return {
    profile,
    favorites,
    loading,
    setProfile,
    updateProfile,
    setFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
  }
})

