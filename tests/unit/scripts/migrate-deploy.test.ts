import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  databaseFingerprint,
  migrationTarget,
  resolveMigrationUrl,
  run,
  shouldRunMigrations,
  stagingGuardError,
} from '../../../scripts/migrate-deploy.mjs'

const spawnSync = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawnSync, default: { spawnSync } }))

describe('shouldRunMigrations', () => {
  it('runs for production and the flagged staging preview only', () => {
    expect(shouldRunMigrations({ VERCEL_ENV: 'production' })).toBe(true)
    expect(shouldRunMigrations({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(shouldRunMigrations({ VERCEL_ENV: 'preview', MIGRATE_STAGING: '1' })).toBe(true)
    expect(shouldRunMigrations({ VERCEL_ENV: 'development', MIGRATE_STAGING: '1' })).toBe(false)
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

const PROD_URL = 'postgresql://u:p@ep-prod-123-pooler.eu-central-1.aws.neon.tech/db?sslmode=require'
const PROD_DIRECT = 'postgresql://u:p@ep-prod-123.eu-central-1.aws.neon.tech/db?sslmode=require'
const STAGING_URL = 'postgresql://u:p@ep-dev-456-pooler.eu-central-1.aws.neon.tech/db'
const STAGING_DIRECT = 'postgresql://u:p@ep-dev-456.eu-central-1.aws.neon.tech/db'
const PROD_FP = databaseFingerprint(PROD_DIRECT) as string

describe('migrationTarget', () => {
  it('maps envs to targets', () => {
    expect(migrationTarget({ VERCEL_ENV: 'production' })).toBe('production')
    expect(migrationTarget({ VERCEL_ENV: 'production', MIGRATE_STAGING: '1' })).toBe('production')
    expect(migrationTarget({ VERCEL_ENV: 'preview', MIGRATE_STAGING: '1' })).toBe('staging')
    expect(migrationTarget({ VERCEL_ENV: 'preview', MIGRATE_STAGING: 'true' })).toBeNull()
    expect(migrationTarget({ MIGRATE_STAGING: '1' })).toBeNull()
  })
})

describe('databaseFingerprint', () => {
  it('is a sha256 hex of the host and ignores credentials, path and the -pooler suffix', () => {
    expect(PROD_FP).toMatch(/^[0-9a-f]{64}$/)
    expect(databaseFingerprint(PROD_URL)).toBe(PROD_FP)
    expect(
      databaseFingerprint('postgresql://x:y@EP-PROD-123.eu-central-1.aws.neon.tech/other')
    ).toBe(PROD_FP)
    expect(databaseFingerprint(STAGING_DIRECT)).not.toBe(PROD_FP)
  })
  it('returns null for unparsable urls', () => {
    expect(databaseFingerprint('not a url')).toBeNull()
  })
})

describe('stagingGuardError', () => {
  const base = { VERCEL_ENV: 'preview', MIGRATE_STAGING: '1' }
  it('requires a valid production fingerprint', () => {
    expect(stagingGuardError({ ...base, DATABASE_URL: STAGING_URL })).toMatch(/FINGERPRINT/)
    expect(
      stagingGuardError({
        ...base,
        DATABASE_URL: STAGING_URL,
        PRODUCTION_DATABASE_FINGERPRINT: 'abc',
      })
    ).toMatch(/FINGERPRINT/)
  })
  it('refuses when either url is the production database', () => {
    const env = { ...base, PRODUCTION_DATABASE_FINGERPRINT: PROD_FP }
    expect(stagingGuardError({ ...env, DATABASE_URL: PROD_URL })).toMatch(/PRODUCTION/)
    expect(
      stagingGuardError({ ...env, DATABASE_URL: STAGING_URL, DATABASE_URL_UNPOOLED: PROD_DIRECT })
    ).toMatch(/PRODUCTION/)
    expect(
      stagingGuardError({ ...env, DATABASE_URL: PROD_URL, DATABASE_URL_UNPOOLED: STAGING_DIRECT })
    ).toMatch(/PRODUCTION/)
  })
  it('refuses unparsable urls', () => {
    expect(
      stagingGuardError({ ...base, PRODUCTION_DATABASE_FINGERPRINT: PROD_FP, DATABASE_URL: 'x' })
    ).toMatch(/parsed/)
  })
  it('passes for a different (branch) database', () => {
    expect(
      stagingGuardError({
        ...base,
        PRODUCTION_DATABASE_FINGERPRINT: PROD_FP.toUpperCase(),
        DATABASE_URL: STAGING_URL,
        DATABASE_URL_UNPOOLED: STAGING_DIRECT,
      })
    ).toBeNull()
  })
})

describe('run (staging)', () => {
  beforeEach(() => {
    spawnSync.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  const base = { VERCEL_ENV: 'preview', MIGRATE_STAGING: '1' }

  it('fails loudly and never migrates when pointed at production', () => {
    const env = { ...base, PRODUCTION_DATABASE_FINGERPRINT: PROD_FP, DATABASE_URL: PROD_URL }
    expect(run(env)).toBe(1)
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('fails without the production fingerprint', () => {
    expect(run({ ...base, DATABASE_URL: STAGING_URL })).toBe(1)
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('migrates the branch database with the unpooled url', () => {
    spawnSync.mockReturnValue({ status: 0 })
    const env = {
      ...base,
      PRODUCTION_DATABASE_FINGERPRINT: PROD_FP,
      DATABASE_URL: STAGING_URL,
      DATABASE_URL_UNPOOLED: STAGING_DIRECT,
    }
    expect(run(env)).toBe(0)
    expect(spawnSync.mock.calls[0][2].env.DATABASE_URL).toBe(STAGING_DIRECT)
  })

  it('skips an unflagged preview (e.g. any other branch)', () => {
    expect(run({ VERCEL_ENV: 'preview', DATABASE_URL: PROD_URL })).toBe(0)
    expect(spawnSync).not.toHaveBeenCalled()
  })
})
