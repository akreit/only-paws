export function useFavorites() {
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const loading = ref(false)

  async function fetchFavorites() {
    loading.value = true

    try {
      const favorites = await $fetch<{ locationId: string }[]>('/api/favorites')
      const locationIds = favorites.map((f) => f.locationId)
      userStore.setFavorites(locationIds)
      return locationIds
    } catch (error) {
      notifications.error('Failed to fetch favorites')
      throw error
    } finally {
      loading.value = false
    }
  }

  async function addFavorite(locationId: string) {
    loading.value = true

    try {
      await $fetch('/api/favorites', {
        method: 'POST',
        body: { locationId },
      })

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
    isFavorite: userStore.isFavorite,
    fetchFavorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
  }
}

