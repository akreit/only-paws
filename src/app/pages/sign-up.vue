<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full">
      <SignUp />
    </div>
  </div>
</template>

<script setup lang="ts">
import { SignUp } from '@clerk/nuxt/components'

useHead({
  title: 'Sign Up - Only Paws',
})
</script>

