<template>
  <div class="flex min-h-screen flex-col">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
    <Toast />
  </div>
</template>

<script setup lang="ts">
// Components will be auto-imported
</script>
