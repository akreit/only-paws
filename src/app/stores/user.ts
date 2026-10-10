import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Location, User } from '~/types'

export const useUserStore = defineStore('user', () => {
  const profile = ref<User | null>(null)
  const favorites = ref<string[]>([])
  // Location objects from the last favorites fetch (see useFavorites().favoriteLocations)
  const favoriteLocationData = ref<Location[]>([])
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

  function setFavoriteLocations(locations: Location[]) {
    favoriteLocationData.value = locations
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
    favoriteLocationData,
    loading,
    setProfile,
    updateProfile,
    setFavorites,
    setFavoriteLocations,
    addFavorite,
    removeFavorite,
    isFavorite,
  }
})
