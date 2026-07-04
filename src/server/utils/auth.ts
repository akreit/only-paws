import { getAuth } from '@clerk/nuxt/server'
import type { H3Event } from 'h3'

export async function requireAuth(event: H3Event): Promise<string> {
  try {
    const auth = getAuth(event)

    if (!auth?.userId) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized',
      })
    }

    return auth.userId
  } catch (error) {
    console.error('Authentication failed:', error)
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }
}
