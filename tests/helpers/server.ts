import { vi } from 'vitest'
import { withDatabaseErrorHandling } from '../../src/server/utils/database'
import { PUBLIC_USER_SELECT, requireDbUser, toOwnProfile } from '../../src/server/utils/user'
import {
  LOCATION_DETAIL_INCLUDE,
  LOCATION_LIST_INCLUDE,
  withAverageRating,
} from '../../src/server/utils/location'
import { parseLocationUpdate } from '../../src/server/utils/location-update'
import { parseReviewUpdate } from '../../src/server/utils/review-update'

export function setupServerMocks() {
  const prisma = {
    location: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

  const useRuntimeConfig = vi.fn().mockReturnValue({ public: { cloudinaryCloudName: 'demo' } })
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
  vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
  vi.stubGlobal('getQuery', getQuery)
  vi.stubGlobal('readBody', readBody)
  vi.stubGlobal('getRouterParam', getRouterParam)
  vi.stubGlobal('createError', createError)
  vi.stubGlobal('defineEventHandler', defineEventHandler)
  vi.stubGlobal('withDatabaseErrorHandling', withDatabaseErrorHandling)
  // Real implementation, driven by the mocked requireAuth/prisma
  vi.stubGlobal('requireDbUser', requireDbUser)
  vi.stubGlobal('PUBLIC_USER_SELECT', PUBLIC_USER_SELECT)
  vi.stubGlobal('toOwnProfile', toOwnProfile)
  vi.stubGlobal('LOCATION_LIST_INCLUDE', LOCATION_LIST_INCLUDE)
  vi.stubGlobal('LOCATION_DETAIL_INCLUDE', LOCATION_DETAIL_INCLUDE)
  vi.stubGlobal('withAverageRating', withAverageRating)
  vi.stubGlobal('parseLocationUpdate', parseLocationUpdate)
  vi.stubGlobal('parseReviewUpdate', parseReviewUpdate)

  return {
    prisma,
    requireAuth,
    useRuntimeConfig,
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
