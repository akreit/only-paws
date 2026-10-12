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
const STAGING_FP = databaseFingerprint(STAGING_DIRECT) as string
const FPS = { PRODUCTION_DATABASE_FINGERPRINT: PROD_FP, STAGING_DATABASE_FINGERPRINT: STAGING_FP }

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
  it('is 16 hex chars and ignores credentials, path, port and the -pooler suffix', () => {
    expect(PROD_FP).toMatch(/^[0-9a-f]{16}$/)
    expect(databaseFingerprint(PROD_URL)).toBe(PROD_FP)
    expect(
      databaseFingerprint('postgresql://x:y@ep-prod-123.eu-central-1.aws.neon.tech:6543/o')
    ).toBe(PROD_FP)
    expect(STAGING_FP).not.toBe(PROD_FP)
  })
  it('normalises case, a trailing dot and percent-encoding', () => {
    expect(databaseFingerprint('postgresql://u@EP-PROD-123.EU-central-1.aws.neon.tech/db')).toBe(
      PROD_FP
    )
    expect(databaseFingerprint('postgresql://u@ep-prod-123.eu-central-1.aws.neon.tech./db')).toBe(
      PROD_FP
    )
    expect(databaseFingerprint('postgresql://u@ep%2Dprod-123.eu-central-1.aws.neon.tech/db')).toBe(
      PROD_FP
    )
  })
  it('handles bracketed IPv6 hosts', () => {
    const fp = databaseFingerprint('postgresql://u@[::1]:5432/db')
    expect(fp).toMatch(/^[0-9a-f]{16}$/)
    expect(fp).toBe(databaseFingerprint('postgresql://u@[::1]/other'))
  })
  it('includes the Neon endpoint from options=endpoint=', () => {
    const viaOptions =
      'postgresql://u@ep-dev-456.eu-central-1.aws.neon.tech/db?options=endpoint%3Dep-prod-123'
    expect(databaseFingerprint(viaOptions)).not.toBe(STAGING_FP)
    expect(databaseFingerprint(viaOptions)).not.toBe(databaseFingerprint(STAGING_DIRECT))
  })
  it('returns null for unparsable urls', () => {
    expect(databaseFingerprint('not a url')).toBeNull()
    expect(databaseFingerprint('postgresql://u@%E0%A4%A/db')).toBeNull()
  })
})

describe('stagingGuardError', () => {
  const base = { VERCEL_ENV: 'preview', MIGRATE_STAGING: '1' }
  it('passes only when every url is the allowlisted staging database', () => {
    expect(
      stagingGuardError({
        ...base,
        ...FPS,
        DATABASE_URL: STAGING_URL,
        DATABASE_URL_UNPOOLED: STAGING_DIRECT,
      })
    ).toBeNull()
    expect(stagingGuardError({ ...base, ...FPS, DATABASE_URL_UNPOOLED: STAGING_DIRECT })).toBeNull()
    expect(
      stagingGuardError({
        ...base,
        PRODUCTION_DATABASE_FINGERPRINT: PROD_FP.toUpperCase(),
        STAGING_DATABASE_FINGERPRINT: ` ${STAGING_FP} `,
        DATABASE_URL: STAGING_URL,
      })
    ).toBeNull()
  })
  it('requires both fingerprints and reports what it saw', () => {
    const missingStaging = stagingGuardError({
      ...base,
      PRODUCTION_DATABASE_FINGERPRINT: PROD_FP,
      DATABASE_URL: STAGING_URL,
    })
    expect(missingStaging).toMatch(/STAGING_DATABASE_FINGERPRINT/)
    expect(missingStaging).toContain(STAGING_FP)
    expect(
      stagingGuardError({
        ...base,
        STAGING_DATABASE_FINGERPRINT: STAGING_FP,
        DATABASE_URL: STAGING_URL,
      })
    ).toMatch(/PRODUCTION_DATABASE_FINGERPRINT/)
    expect(
      stagingGuardError({
        ...base,
        ...FPS,
        STAGING_DATABASE_FINGERPRINT: 'abc',
        DATABASE_URL: STAGING_URL,
      })
    ).toMatch(/STAGING_DATABASE_FINGERPRINT/)
    expect(
      stagingGuardError({
        ...base,
        ...FPS,
        STAGING_DATABASE_FINGERPRINT: PROD_FP,
        DATABASE_URL: STAGING_URL,
      })
    ).toMatch(/equals the production/)
  })
  it('refuses the production database (second layer)', () => {
    expect(stagingGuardError({ ...base, ...FPS, DATABASE_URL: PROD_URL })).toMatch(/PRODUCTION/)
    expect(
      stagingGuardError({
        ...base,
        ...FPS,
        DATABASE_URL: STAGING_URL,
        DATABASE_URL_UNPOOLED: PROD_DIRECT,
      })
    ).toMatch(/PRODUCTION/)
  })
  it('refuses any url that is not the staging database (allowlist), incl. known bypasses', () => {
    const bypasses = [
      'postgresql://u@10.0.0.5/db',
      'postgresql://u@db.example.com/db',
      'postgresql://u@ep-other-789.eu-central-1.aws.neon.tech/db',
      'postgresql://u@ep-dev-456.eu-central-1.aws.neon.tech/db?options=endpoint%3Dep-prod-123',
    ]
    for (const url of bypasses) {
      expect(stagingGuardError({ ...base, ...FPS, DATABASE_URL: url })).toMatch(/not the staging/)
      expect(
        stagingGuardError({
          ...base,
          ...FPS,
          DATABASE_URL: STAGING_URL,
          DATABASE_URL_UNPOOLED: url,
        })
      ).toMatch(/not the staging/)
    }
  })
  it('refuses unparsable urls and a missing url', () => {
    expect(stagingGuardError({ ...base, ...FPS, DATABASE_URL: 'x' })).toMatch(/parsed/)
    expect(stagingGuardError({ ...base, ...FPS })).toMatch(/No DATABASE_URL/)
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
    expect(run({ ...base, ...FPS, DATABASE_URL: PROD_URL })).toBe(1)
    expect(spawnSync).not.toHaveBeenCalled()
  })

  it('fails without the fingerprints and logs what it saw', () => {
    expect(run({ ...base, DATABASE_URL: STAGING_URL })).toBe(1)
    expect(spawnSync).not.toHaveBeenCalled()
    expect(String(vi.mocked(console.error).mock.calls.at(-1)?.[0])).toContain(STAGING_FP)
  })

  it('migrates the staging branch with the unpooled url', () => {
    spawnSync.mockReturnValue({ status: 0 })
    const env = {
      ...base,
      ...FPS,
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

  it('logs the production fingerprint in production builds', () => {
    spawnSync.mockReturnValue({ status: 0 })
    expect(run({ VERCEL_ENV: 'production', DATABASE_URL_UNPOOLED: PROD_DIRECT })).toBe(0)
    expect(vi.mocked(console.log).mock.calls.flat().join(' ')).toContain(PROD_FP)
  })
})
