import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Location, User } from '~/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const favorites = ref<string[]>([])
  const favoriteLocationCache = ref<Location[]>([])
  const favoritesLoaded = ref(false)
  // Plain closure state (per Pinia instance, so nothing leaks across SSR requests).
  // `generation` bumps on reset() so responses started before it can be dropped.
  let generation = 0
  let favoritesRequest: Promise<string[]> | null = null

  function setUser(userData: User | null) {
    user.value = userData
  }

  function setFavorites(locations: Location[]) {
    favoriteLocationCache.value = locations
    favorites.value = locations.map((l) => l.id)
    favoritesLoaded.value = true
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

  // Loads favorites through `fetcher`, sharing one in-flight request between callers.
  // Every caller gets the same promise, so a rejection reaches all of them and each
  // decides how to report it (silent log vs toast). A result that arrives after
  // reset() is discarded without touching the store or favoritesLoaded.
  function loadFavorites(fetcher: () => Promise<Location[]>): Promise<string[]> {
    if (favoritesRequest) return favoritesRequest

    const startedAt = generation
    const request: Promise<string[]> = fetcher()
      .then((locations) => {
        if (startedAt === generation) setFavorites(locations)
        return locations.map((l) => l.id)
      })
      .finally(() => {
        if (favoritesRequest === request) favoritesRequest = null
      })
    favoritesRequest = request
    return request
  }

  function reset() {
    generation++
    favoritesRequest = null
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
    setFavorites,
    loadFavorites,
    addFavorite,
    removeFavorite,
    reset,
    isFavorite,
  }
})
