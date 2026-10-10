import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    {
      // Nuxt replaces import.meta.server at build time; tests flip it via a global
      name: 'test-import-meta-server',
      transform: (code) =>
        code.includes('import.meta.server')
          ? code.replaceAll('import.meta.server', 'Boolean(globalThis.__TEST_SSR__)')
          : null,
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/unit/**/*.{spec,test}.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.nuxt/',
        '.output/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src/app'),
      '@': resolve(__dirname, './src/app'),
      '#server': resolve(__dirname, './src/server'),
    },
  },
})
