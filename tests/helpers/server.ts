import { vi } from 'vitest'
import { withDatabaseErrorHandling } from '../../src/server/utils/database'

export function setupServerMocks() {
  const prisma = {
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
  }

  const requireAuth = vi.fn()
  const getQuery = vi.fn().mockReturnValue({})
  const readBody = vi.fn().mockResolvedValue({})
  const getRouterParam = vi.fn()
  const createError = vi.fn((opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message) as Error & { statusCode: number }
    err.statusCode = opts.statusCode
    return err
  })
  const defineEventHandler = vi.fn((handler: (...args: unknown[]) => unknown) => handler)

  vi.stubGlobal('prisma', prisma)
  vi.stubGlobal('requireAuth', requireAuth)
  vi.stubGlobal('getQuery', getQuery)
  vi.stubGlobal('readBody', readBody)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('defineEventHandler', defineEventHandler)
  vi.stubGlobal('withDatabaseErrorHandling', withDatabaseErrorHandling)

  return {
    prisma,
    requireAuth,
    getQuery,
    readBody,
    getRouterParam,
    createError,
    defineEventHandler,
  }
}

export function createMockEvent() {
  return {} as unknown
}
