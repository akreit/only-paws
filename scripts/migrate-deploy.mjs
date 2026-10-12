// Applies Prisma migrations during Vercel builds:
// - production builds (VERCEL_ENV=production) migrate the production database;
// - the develop staging build (VERCEL_ENV=preview + MIGRATE_STAGING=1, set by CI's deploy-staging
//   job) migrates only if every database URL matches the allowlisted STAGING_DATABASE_FINGERPRINT
//   and none matches PRODUCTION_DATABASE_FINGERPRINT; otherwise it fails the build.
// Any other build skips migrations.
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

const FINGERPRINT_RE = /^[0-9a-f]{16}$/

/**
 * Normalised database identity, or null if unparsable: the host (percent-decoded, lower-cased,
 * trailing dot and IPv6 brackets removed, Neon's `-pooler` suffix stripped) plus the Neon endpoint
 * id. The endpoint comes from `options=endpoint=<id>` when present (libpq/Neon route by it),
 * otherwise from a `*.neon.tech` host. The port is ignored.
 */
export function databaseIdentity(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  let host
  try {
    host = decodeURIComponent(parsed.hostname)
  } catch {
    return null
  }
  host = host
    .toLowerCase()
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/\.+$/, '')
  if (!host) return null
  const labels = host.split('.')
  labels[0] = labels[0].replace(/-pooler$/, '')
  host = labels.join('.')

  let endpoint = ''
  const options = parsed.searchParams.get('options')
  const match = options && /(?:^|\s)endpoint=([^\s]+)/i.exec(options)
  if (match) endpoint = match[1].toLowerCase()
  else if (host.endsWith('.neon.tech')) endpoint = labels[0]
  return `${host}|endpoint=${endpoint}`
}

/** Short, non-secret fingerprint (16 hex chars of SHA-256) of a database URL, or null. */
export function databaseFingerprint(url) {
  const identity = databaseIdentity(url)
  if (!identity) return null
  return createHash('sha256').update(identity).digest('hex').slice(0, 16)
}

function readFingerprint(value) {
  const normalized = (value || '').trim().toLowerCase()
  return FINGERPRINT_RE.test(normalized) ? normalized : null
}

/**
 * Hard guard for staging (allowlist + denylist): every database URL (pooled and unpooled) must
 * match STAGING_DATABASE_FINGERPRINT, and none may match PRODUCTION_DATABASE_FINGERPRINT.
 * Returns an error message (including what was seen, so a refused run reveals the value to save)
 * or null when migrating is allowed.
 */
export function stagingGuardError(env) {
  const urls = [env.DATABASE_URL, env.DATABASE_URL_UNPOOLED].filter(Boolean)
  if (urls.length === 0) return 'No DATABASE_URL_UNPOOLED or DATABASE_URL set.'
  const seen = urls.map((url) => databaseFingerprint(url))
  const seenText = `seen fingerprint(s): ${seen.map((f) => f ?? 'unparsable').join(', ')}`
  if (seen.some((f) => !f)) return `A database URL could not be parsed (${seenText}).`

  const prod = readFingerprint(env.PRODUCTION_DATABASE_FINGERPRINT)
  const staging = readFingerprint(env.STAGING_DATABASE_FINGERPRINT)
  if (!prod) return `PRODUCTION_DATABASE_FINGERPRINT is missing or invalid (${seenText}).`
  // Before the staging checks, so a setup ("pending") run that sees prod says so directly
  if (seen.some((f) => f === prod))
    return `A database URL is the PRODUCTION database (${seenText}).`
  if (!staging) {
    return `STAGING_DATABASE_FINGERPRINT is missing or invalid (${seenText}); save the seen fingerprint as STAGING_DATABASE_FINGERPRINT.`
  }
  if (staging === prod) return 'STAGING_DATABASE_FINGERPRINT equals the production fingerprint.'
  if (seen.some((f) => f !== staging)) {
    return `Database is not the staging branch (${seenText}; expected ${staging}).`
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
      console.error(`[migrate-deploy] Refusing to migrate staging: ${error} Failing the build.`)
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
