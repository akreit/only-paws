export default defineNuxtRouteMiddleware(() => {
  const { isSignedIn, isLoaded } = useAuth()

  // Wait for auth to load
  if (!isLoaded.value) {
    return
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn.value) {
    return navigateTo('/sign-in')
  }
})

