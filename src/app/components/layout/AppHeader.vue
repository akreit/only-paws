<template>
  <header class="bg-white shadow-sm sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span class="text-3xl">🐾</span>
          <span class="text-xl font-bold text-gray-900">Only Paws</span>
        </NuxtLink>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center gap-6">
          <NuxtLink
            to="/map"
            class="text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            Explore Map
          </NuxtLink>
          <NuxtLink
            v-if="isSignedIn"
            to="/profile"
            class="text-gray-700 hover:text-blue-600 font-medium transition-colors"
          >
            My Profile
          </NuxtLink>
        </nav>

        <!-- Auth Section -->
        <div class="flex items-center gap-3">
          <template v-if="isSignedIn">
            <NuxtLink
              to="/profile"
              class="hidden sm:flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <img
                v-if="user?.imageUrl"
                :src="user.imageUrl"
                :alt="user.username || 'User'"
                class="h-8 w-8 rounded-full border-2 border-gray-200"
              >
              <span class="font-medium">{{ user?.username || user?.firstName || 'Profile' }}</span>
            </NuxtLink>
            <SignOutButton>
              <Button variant="outline" size="sm">Sign Out</Button>
            </SignOutButton>
          </template>
          <template v-else>
            <NuxtLink to="/sign-in">
              <Button variant="outline" size="sm">Sign In</Button>
            </NuxtLink>
            <NuxtLink to="/sign-up">
              <Button variant="primary" size="sm">Get Started</Button>
            </NuxtLink>
          </template>
        </div>

        <!-- Mobile menu button -->
        <button
          class="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Mobile menu -->
      <Transition name="slide">
        <div v-if="mobileMenuOpen" class="md:hidden py-4 border-t border-gray-200">
          <nav class="flex flex-col gap-3">
            <NuxtLink
              to="/map"
              class="text-gray-700 hover:text-blue-600 font-medium px-2 py-1"
              @click="mobileMenuOpen = false"
            >
              Explore Map
            </NuxtLink>
            <NuxtLink
              v-if="isSignedIn"
              to="/profile"
              class="text-gray-700 hover:text-blue-600 font-medium px-2 py-1"
              @click="mobileMenuOpen = false"
            >
              My Profile
            </NuxtLink>
          </nav>
        </div>
      </Transition>
    </div>
  </header>
</template>

<script setup lang="ts">
import { SignOutButton } from '@clerk/nuxt/components'

const { isSignedIn } = useAuth()
const { user } = useUser()
const mobileMenuOpen = ref(false)
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
