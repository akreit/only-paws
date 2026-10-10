import type { Location } from '~/types'
import { markLocationsChanged } from '~/utils/locations-cache'

interface FavoriteEntry {
  locationId: string
  location: Location
}

export function useFavorites() {
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const loading = ref(false)

  // `silent` is for background loads, which log instead of toasting
  async function fetchFavorites({ silent = false }: { silent?: boolean } = {}) {
    loading.value = true

    try {
      // Concurrent callers share one request; each handles a failure itself below
      return await userStore.loadFavorites(async () => {
        const entries = await $fetch<FavoriteEntry[]>('/api/favorites')
        return entries.map((e) => e.location)
      })
    } catch (error) {
      if (silent) {
        console.error('Failed to fetch favorites:', error)
      } else {
        notifications.error('Failed to fetch favorites')
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  // Skips the request when favorites were already loaded (e.g. by useAuthSync)
  async function ensureFavorites(options: { silent?: boolean } = {}) {
    if (userStore.favoritesLoaded) return userStore.favorites
    return fetchFavorites(options)
  }

  async function addFavorite(locationId: string) {
    loading.value = true

    try {
      await $fetch('/api/favorites', {
        method: 'POST',
        body: { locationId },
      })

      markLocationsChanged()
      userStore.addFavorite(locationId)
      notifications.success('Added to favorites!')
    } catch (error) {
      notifications.error('Failed to add favorite')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function removeFavorite(locationId: string) {
    loading.value = true

    try {
      await $fetch(`/api/favorites/${locationId}`, {
        method: 'DELETE',
      })

      markLocationsChanged()
      userStore.removeFavorite(locationId)
      notifications.success('Removed from favorites!')
    } catch (error) {
      notifications.error('Failed to remove favorite')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(locationId: string) {
    if (userStore.isFavorite(locationId)) {
      await removeFavorite(locationId)
    } else {
      await addFavorite(locationId)
    }
  }

  return {
    loading,
    favorites: computed(() => userStore.favorites),
    // Fetched locations that are still favorited, so unfavoriting drops them immediately
    favoriteLocations: computed(() =>
      userStore.favoriteLocationCache.filter((l) => userStore.favorites.includes(l.id))
    ),
    isFavorite: userStore.isFavorite,
    fetchFavorites,
    ensureFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  }
}
