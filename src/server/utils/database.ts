const CONNECTION_ERROR_NAMES = new Set(['PrismaClientInitializationError'])

// Prisma codes (P1xxx = connection/server issues) and driver/network codes (adapter-pg)
const CONNECTION_ERROR_CODES = new Set([
  'P1000',
  'P1001',
  'P1002',
  'P1008',
  'P1017',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'EAI_AGAIN',
])

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const { name, code } = error as { name?: unknown; code?: unknown }

  return (
    (typeof name === 'string' && CONNECTION_ERROR_NAMES.has(name)) ||
    (typeof code === 'string' && CONNECTION_ERROR_CODES.has(code))
  )
}

/**
 * Runs a database operation and converts connection failures into a 503 so raw
 * Prisma errors never reach the client. Other errors are rethrown untouched.
 */
export async function withDatabaseErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.error('Database unavailable:', error)
      throw createError({
        statusCode: 503,
        message: 'Database is currently unavailable. Please try again later.',
      })
    }
    throw error
  }
}
