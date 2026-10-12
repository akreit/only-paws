// Applies Prisma migrations during Vercel builds:
// - production builds (VERCEL_ENV=production) migrate the production database;
// - the develop staging build (VERCEL_ENV=preview + MIGRATE_STAGING=1, set by CI's deploy-staging
//   job) migrates its Neon preview branch, but only after a hard guard proves the target database
//   is not production. Any other build skips migrations.
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** 'production' | 'staging' | null (skip). */
export function migrationTarget(env) {
  if (env.VERCEL_ENV === 'production') return 'production'
  if (env.VERCEL_ENV === 'preview' && env.MIGRATE_STAGING === '1') return 'staging'
  return null
}

/** Kept for callers/tests: true when this build migrates at all. */
export function shouldRunMigrations(env) {
  return migrationTarget(env) !== null
}

// Prefer the direct (unpooled) connection; migrations don't work well through a pooler.
export function resolveMigrationUrl(env) {
  return env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || undefined
}

/**
 * Non-secret identity of a database: SHA-256 of its lower-cased host with Neon's `-pooler`
 * suffix removed, so the pooled and direct URLs of one Neon endpoint (branch) match.
 * Returns null for unparsable URLs.
 */
export function databaseFingerprint(url) {
  let host
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host) return null
  const [first, ...rest] = host.split('.')
  const normalized = [first.replace(/-pooler$/, ''), ...rest].join('.')
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Hard guard for staging: refuse unless the production fingerprint is known and neither
 * DATABASE_URL nor DATABASE_URL_UNPOOLED points at that database. Returns an error message or null.
 */
export function stagingGuardError(env) {
  const prod = (env.PRODUCTION_DATABASE_FINGERPRINT || '').trim().toLowerCase()
  if (!/^[0-9a-f]{64}$/.test(prod)) {
    return 'PRODUCTION_DATABASE_FINGERPRINT is missing or invalid; refusing to migrate staging.'
  }
  const urls = [env.DATABASE_URL, env.DATABASE_URL_UNPOOLED].filter(Boolean)
  if (urls.length === 0) return 'No DATABASE_URL_UNPOOLED or DATABASE_URL set.'
  for (const url of urls) {
    const fingerprint = databaseFingerprint(url)
    if (!fingerprint) return 'A database URL could not be parsed; refusing to migrate staging.'
    if (fingerprint === prod) {
      return 'The staging build points at the PRODUCTION database; refusing to migrate.'
    }
  }
  return null
}

export function run(env = process.env) {
  const target = migrationTarget(env)
  if (!target) {
    console.log(
      `[migrate-deploy] Skipping migrations (VERCEL_ENV=${env.VERCEL_ENV ?? 'unset'}, not production or staging).`
    )
    return 0
  }

  const url = resolveMigrationUrl(env)
  if (!url) {
    console.error('[migrate-deploy] No DATABASE_URL_UNPOOLED or DATABASE_URL set.')
    return 1
  }

  if (target === 'staging') {
    const error = stagingGuardError(env)
    if (error) {
      console.error(`[migrate-deploy] ${error} Failing the staging build.`)
      return 1
    }
  } else {
    // Non-secret; copy into the GitHub variable PRODUCTION_DATABASE_FINGERPRINT for staging
    console.log(`[migrate-deploy] Production database fingerprint: ${databaseFingerprint(url)}`)
  }

  console.log(`[migrate-deploy] Running prisma migrate deploy (${target})...`)
  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...env, DATABASE_URL: url },
  })
  if (result.status !== 0) {
    console.error('[migrate-deploy] prisma migrate deploy failed.')
    return result.status ?? 1
  }
  return 0
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run())
}
