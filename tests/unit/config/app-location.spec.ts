import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')

// Nuxt only picks up app.vue from srcDir; elsewhere it silently falls back to its
// built-in app, so the auth-sync plugin never runs and the User row is never created.
describe('app entry', () => {
  it('lives under the configured srcDir', () => {
    const config = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
    expect(config).toMatch(/srcDir:\s*'src\/app'/)
    expect(existsSync(resolve(root, 'src/app/app.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'src/app.vue'))).toBe(false)
  })

  it('has the client-only auth sync plugin', () => {
    expect(existsSync(resolve(root, 'src/app/plugins/auth-sync.client.ts'))).toBe(true)
  })
})
