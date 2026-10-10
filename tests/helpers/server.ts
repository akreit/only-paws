import { vi } from 'vitest'
import { withDatabaseErrorHandling } from '../../src/server/utils/database'
import { requireDbUser } from '../../src/server/utils/user'

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
      upsert: vi.fn(),
    },
    favorite: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
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
  // Real implementation, driven by the mocked requireAuth/prisma
  vi.stubGlobal('requireDbUser', requireDbUser)

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
