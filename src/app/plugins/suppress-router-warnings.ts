export default defineNuxtPlugin(() => {
  // Suppress Vue Router warnings for API routes
  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const message = args[0]

    // Ignore Vue Router warnings about API routes
    if (
      typeof message === 'string' &&
      message.includes('[Vue Router warn]') &&
      message.includes('/api/')
    ) {
      return
    }

    // Pass through all other warnings
    originalWarn.apply(console, args)
  }
})
