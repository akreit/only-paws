// Applies Prisma migrations during Vercel production builds only.
// Preview and production share one database, so previews must never migrate.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export function shouldRunMigrations(env) {
  return env.VERCEL_ENV === 'production'
}

// Prefer the direct (unpooled) connection; migrations don't work well through a pooler.
export function resolveMigrationUrl(env) {
  return env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || undefined
}

export function run(env = process.env) {
  if (!shouldRunMigrations(env)) {
    console.log(
      `[migrate-deploy] Skipping migrations (VERCEL_ENV=${env.VERCEL_ENV ?? 'unset'}, not production).`
    )
    return 0
  }

  const url = resolveMigrationUrl(env)
  if (!url) {
    console.error('[migrate-deploy] No DATABASE_URL_UNPOOLED or DATABASE_URL set.')
    return 1
  }

  console.log('[migrate-deploy] Running prisma migrate deploy...')
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
