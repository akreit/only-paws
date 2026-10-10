import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Location, User } from '~/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const favorites = ref<string[]>([])
  const favoriteLocationCache = ref<Location[]>([])
  const favoritesLoaded = ref(false)

  function setUser(userData: User | null) {
    user.value = userData
  }

  function updateUser(updates: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }

  function setFavorites(locationIds: string[]) {
    favorites.value = locationIds
    favoritesLoaded.value = true
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

  function reset() {
    user.value = null
    favorites.value = []
    favoriteLocationCache.value = []
    favoritesLoaded.value = false
  }

  function isFavorite(locationId: string): boolean {
    return favorites.value.includes(locationId)
  }

  return {
    user,
    favorites,
    favoriteLocationCache,
    favoritesLoaded,
    setUser,
    updateUser,
    setFavorites,
    setFavoriteLocationCache,
    addFavorite,
    removeFavorite,
    reset,
    isFavorite,
  }
})
