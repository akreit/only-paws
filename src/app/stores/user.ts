import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Location, User } from '~/types'

export const useUserStore = defineStore('user', () => {
  const profile = ref<User | null>(null)
  const favorites = ref<string[]>([])
  const favoriteLocationCache = ref<Location[]>([])
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

  function setFavoriteLocationCache(locations: Location[]) {
    favoriteLocationCache.value = locations
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
    favoriteLocationCache,
    loading,
    setProfile,
    updateProfile,
    setFavorites,
    setFavoriteLocationCache,
    addFavorite,
    removeFavorite,
    isFavorite,
  }
})
