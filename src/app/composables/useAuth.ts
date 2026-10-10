import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nuxt/composables'
import type { User } from '~/types'

export function useAuthSync() {
  const { isSignedIn } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const userStore = useUserStore()
  const notifications = useNotificationsStore()
  const { fetchFavorites } = useFavorites()

  // Sync Clerk user with our database
  async function syncUser() {
    if (!clerkUser.value) {
      userStore.reset()
      return
    }

    const clerkId = clerkUser.value.id
    // Sign-out or account switch while a request was in flight: drop its result
    const isStale = () => clerkUser.value?.id !== clerkId

    // Clerk multi-session: don't keep showing the previous account's data
    if (userStore.user && userStore.user.clerkUserId !== clerkId) {
      userStore.reset()
    }

    try {
      const response = await $fetch<User>('/api/users/sync', {
        method: 'POST',
      })
      if (isStale()) return

      userStore.setUser(response)
    } catch (error) {
      if (isStale()) return
      console.error('Failed to sync user:', error)
      notifications.error('Failed to load user profile')
      return
    }

    // Load saved places once so hearts show the right state app-wide.
    // Background load: failures are logged, not toasted.
    try {
      await fetchFavorites({ silent: true })
    } catch {
      // already logged by fetchFavorites
    }
  }

  // Watch for Clerk auth changes (registered from the client-only auth-sync plugin).
  // Keyed on the Clerk user id so unrelated user object updates don't re-sync.
  watch(
    [isSignedIn, () => clerkUser.value?.id],
    async ([signedIn, clerkId]) => {
      if (signedIn && clerkId) {
        await syncUser()
      } else {
        userStore.reset()
      }
    },
    { immediate: true }
  )

  return { syncUser }
}
