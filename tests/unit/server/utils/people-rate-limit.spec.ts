import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setupServerMocks, createMockEvent, makeError } from '../../../helpers/server'

const mocks = setupServerMocks()

const { enforcePeopleSearchLimit, PEOPLE_SEARCH_LIMIT } =
  await import('#server/utils/people-rate-limit')

const HOUR = 60 * 60 * 1000
const now = new Date('2026-10-12T12:00:00Z')

describe('enforcePeopleSearchLimit', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.createError.mockImplementation(makeError)
  })

  it('increments inside an open window that is under the limit', async () => {
    mocks.prisma.user.updateMany.mockResolvedValueOnce({ count: 1 })

    await enforcePeopleSearchLimit(createMockEvent() as never, 'me', now)

    expect(mocks.prisma.user.updateMany).toHaveBeenCalledTimes(1)
    expect(mocks.prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'me',
        peopleSearchWindowStart: { gt: new Date(now.getTime() - HOUR) },
        peopleSearchCount: { lt: PEOPLE_SEARCH_LIMIT },
      },
      data: { peopleSearchCount: { increment: 1 } },
    })
  })

  it('starts a new window when there is none or it has expired', async () => {
    mocks.prisma.user.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })

    await enforcePeopleSearchLimit(createMockEvent() as never, 'me', now)

    expect(mocks.prisma.user.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'me',
        OR: [
          { peopleSearchWindowStart: null },
          { peopleSearchWindowStart: { lte: new Date(now.getTime() - HOUR) } },
        ],
      },
      data: { peopleSearchCount: 1, peopleSearchWindowStart: now },
    })
  })

  it('answers 429 with Retry-After and retryAt when the window is used up', async () => {
    const start = new Date(Date.now() - 20 * 60 * 1000)
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 })
    mocks.prisma.user.findUnique.mockResolvedValue({ peopleSearchWindowStart: start })

    const retryAt = new Date(start.getTime() + HOUR)
    await expect(enforcePeopleSearchLimit(createMockEvent() as never, 'me')).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining(retryAt.toISOString()),
      data: { retryAt: retryAt.toISOString() },
    })
    const [, name, seconds] = mocks.setResponseHeader.mock.calls[0]!
    expect(name).toBe('Retry-After')
    expect(seconds).toBeGreaterThan(39 * 60)
    expect(seconds).toBeLessThanOrEqual(40 * 60)
  })

  it('falls back to one window from now if the user row vanished', async () => {
    mocks.prisma.user.updateMany.mockResolvedValue({ count: 0 })
    mocks.prisma.user.findUnique.mockResolvedValue(null)

    await expect(
      enforcePeopleSearchLimit(createMockEvent() as never, 'me', now)
    ).rejects.toMatchObject({ statusCode: 429 })
  })
})
