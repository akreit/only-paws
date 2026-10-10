import { describe, it, expect, vi, beforeEach } from 'vitest'

import { shouldRunMigrations, resolveMigrationUrl, run } from '../../../scripts/migrate-deploy.mjs'

const spawnSync = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawnSync, default: { spawnSync } }))

describe('shouldRunMigrations', () => {
  it('runs only for production', () => {
    expect(shouldRunMigrations({ VERCEL_ENV: 'production' })).toBe(true)
    expect(shouldRunMigrations({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(shouldRunMigrations({ VERCEL_ENV: 'development' })).toBe(false)
    expect(shouldRunMigrations({})).toBe(false)
  })
})

describe('resolveMigrationUrl', () => {
  it('prefers the unpooled url', () => {
    expect(resolveMigrationUrl({ DATABASE_URL: 'a', DATABASE_URL_UNPOOLED: 'b' })).toBe('b')
  })
  it('falls back to DATABASE_URL', () => {
    expect(resolveMigrationUrl({ DATABASE_URL: 'a' })).toBe('a')
    expect(resolveMigrationUrl({ DATABASE_URL: 'a', DATABASE_URL_UNPOOLED: '' })).toBe('a')
  })
  it('returns undefined when nothing is set', () => {
    expect(resolveMigrationUrl({})).toBeUndefined()
  })
})

describe('run', () => {
  beforeEach(() => {
    spawnSync.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('skips outside production', () => {
    expect(run({ VERCEL_ENV: 'preview', DATABASE_URL: 'a' })).toBe(0)
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('fails in production without a url', () => {
    expect(run({ VERCEL_ENV: 'production' })).toBe(1)
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('runs migrate deploy with the unpooled url in production', () => {
    spawnSync.mockReturnValue({ status: 0 })
    const env = {
      VERCEL_ENV: 'production',
      DATABASE_URL: 'pooled',
      DATABASE_URL_UNPOOLED: 'direct',
    }
    expect(run(env)).toBe(0)
    const [cmd, args, opts] = spawnSync.mock.calls[0]
    expect(cmd).toBe('npx')
    expect(args).toEqual(['prisma', 'migrate', 'deploy'])
    expect(opts.env.DATABASE_URL).toBe('direct')
    expect(env.DATABASE_URL).toBe('pooled')
  })

  it('propagates failure in production', () => {
    spawnSync.mockReturnValue({ status: 3 })
    expect(run({ VERCEL_ENV: 'production', DATABASE_URL: 'a' })).toBe(3)
    spawnSync.mockReturnValue({ status: null })
    expect(run({ VERCEL_ENV: 'production', DATABASE_URL: 'a' })).toBe(1)
  })
})
