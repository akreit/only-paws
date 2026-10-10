import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nuxt/composables'
import type { User } from '~/types'

export function useAuthSync() {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const { fetchFavorites } = useFavorites()

  const loading = ref(false)

  function clearUserState() {
    authStore.clearUser()
    userStore.setProfile(null)
    userStore.setFavorites([])
    userStore.setFavoriteLocationCache([])
  }

  // Sync Clerk user with our database
  async function syncUser() {
    if (!clerkUser.value) {
      clearUserState()
      return
    }

    loading.value = true
    try {
      const response = await $fetch<User>('/api/users/sync', {
        method: 'POST',
      })

      authStore.setUser(response)
      userStore.setProfile(response)
    } catch (error) {
      console.error('Failed to sync user:', error)
      notifications.error('Failed to load user profile')
      return
    } finally {
      loading.value = false
    }

    // Load saved places once so hearts show the right state app-wide.
    // Background load: failures are logged, not toasted.
    try {
      await fetchFavorites({ silent: true })
    } catch {
      // already logged by fetchFavorites
    }
  }

  // Watch for Clerk auth changes (registered from the client-only auth-sync plugin)
  watch(
    [isSignedIn, clerkUser],
    async ([signedIn, user]) => {
      if (signedIn && user) {
        await syncUser()
      } else {
        clearUserState()
      }
    },
    { immediate: true }
  )

  return {
    isSignedIn,
    isLoaded,
    user: computed(() => authStore.user),
    loading,
    syncUser,
  }
}
