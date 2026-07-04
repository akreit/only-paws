import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nuxt/composables'
import type { User } from '~/types'

export function useAuthSync() {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { user: clerkUser } = useClerkUser()
  const authStore = useAuthStore()
  const userStore = useUserStore()
  const notifications = useNotificationsStore()

  const loading = ref(false)

  // Sync Clerk user with our database
  async function syncUser() {
    if (!clerkUser.value) {
      authStore.clearUser()
      userStore.setProfile(null)
      return
    }

    loading.value = true
    try {
      const response = await $fetch<User>('/api/users/sync', {
        method: 'POST',
        body: {
          clerkUserId: clerkUser.value.id,
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
    } finally {
      loading.value = false
    }
  }

  // Watch for Clerk auth changes
  watch(
    [isSignedIn, clerkUser],
    async ([signedIn, user]) => {
      if (signedIn && user) {
        await syncUser()
      } else {
        authStore.clearUser()
        userStore.setProfile(null)
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
