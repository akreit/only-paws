<template>
  <div
    class="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8"
  >
    <div class="w-full max-w-md">
      <SignIn />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SignIn } from '@clerk/nuxt/components'

useHead({
  title: 'Sign In - Only Paws',
})
</script>
