import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAuth } from '#server/utils/auth'

const { getAuthMock } = vi.hoisted(() => ({
  getAuthMock: vi.fn(),
}))

vi.mock('@clerk/nuxt/server', () => ({
  getAuth: getAuthMock,
}))

vi.stubGlobal(
  'createError',
  vi.fn((opts: { statusCode: number; message: string }) => {
    const err = new Error(opts.message) as Error & { statusCode: number }
    err.statusCode = opts.statusCode
    return err
  })
)

describe('requireAuth', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns the Clerk user id from the request auth context', async () => {
    getAuthMock.mockReturnValue({ userId: 'user_123' })

    await expect(requireAuth({} as never)).resolves.toBe('user_123')
  })

  it('throws 401 when the request is not authenticated', async () => {
    getAuthMock.mockReturnValue({ userId: null })

    await expect(requireAuth({} as never)).rejects.toMatchObject({
      message: 'Unauthorized',
      statusCode: 401,
    })
  })

  it('throws 401 when Clerk auth lookup itself fails', async () => {
    getAuthMock.mockImplementation(() => {
      throw new Error('boom')
    })

    await expect(requireAuth({} as never)).rejects.toMatchObject({
      message: 'Unauthorized',
      statusCode: 401,
    })
  })
})
