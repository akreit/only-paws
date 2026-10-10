import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isDatabaseConnectionError, withDatabaseErrorHandling } from '#server/utils/database'

vi.stubGlobal(
  'createError',
  vi.fn((opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message) as Error & { statusCode: number }
    err.statusCode = opts.statusCode
    return err
  })
)

describe('isDatabaseConnectionError', () => {
  it.each(['P1001', 'P1017', 'ECONNREFUSED', 'ETIMEDOUT'])('detects code %s', (code) => {
    expect(isDatabaseConnectionError({ code })).toBe(true)
  })

  it('detects Prisma initialization errors by name', () => {
    expect(isDatabaseConnectionError({ name: 'PrismaClientInitializationError' })).toBe(true)
  })

  it.each([null, undefined, 'x', {}, { code: 'P2002' }, { name: 'Error' }])(
    'ignores %j',
    (error) => {
      expect(isDatabaseConnectionError(error)).toBe(false)
    }
  )
})

describe('withDatabaseErrorHandling', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns the operation result', async () => {
    await expect(withDatabaseErrorHandling(async () => 42)).resolves.toBe(42)
  })

  it('maps connection errors to a 503', async () => {
    await expect(
      withDatabaseErrorHandling(() => Promise.reject({ code: 'P1001' }))
    ).rejects.toMatchObject({ statusCode: 503 })
  })

  it('rethrows other errors', async () => {
    const error = { code: 'P2002' }
    await expect(withDatabaseErrorHandling(() => Promise.reject(error))).rejects.toBe(error)
  })
})
