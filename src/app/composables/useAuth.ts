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
    userStore.setFavoriteLocations([])
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
        body: {
          email: clerkUser.value.primaryEmailAddress?.emailAddress,
          username: clerkUser.value.username,
          avatarUrl: clerkUser.value.imageUrl,
        },
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

  // Watch for Clerk auth changes. Client only: during SSR there is no session
  // to forward, so a sync request would be unauthenticated and toast an error.
  if (!import.meta.server) {
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
  }

  return {
    isSignedIn,
    isLoaded,
    user: computed(() => authStore.user),
    loading,
    syncUser,
  }
}
