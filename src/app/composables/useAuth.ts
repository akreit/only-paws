import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nuxt/composables'
import type { User } from '~/types'

export function useAuthSync() {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const { fetchFavorites } = useFavorites()

  const loading = ref(false)

  // Sync Clerk user with our database
  async function syncUser() {
    if (!clerkUser.value) {
      userStore.reset()
      return
    }

    loading.value = true
    try {
      const response = await $fetch<User>('/api/users/sync', {
        method: 'POST',
      })

      userStore.setUser(response)
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
        userStore.reset()
      }
    },
    { immediate: true }
  )

  return {
    isSignedIn,
    isLoaded,
    user: computed(() => userStore.user),
    loading,
    syncUser,
  }
}
