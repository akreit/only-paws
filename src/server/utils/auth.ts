import { clerkClient } from '@clerk/nuxt/server'
import type { H3Event } from 'h3'

export async function requireAuth(event: H3Event): Promise<string> {
  const client = clerkClient(event)

  // Get the Clerk user ID from the request
  const authHeader = getHeader(event, 'authorization')

  if (!authHeader) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - No authorization header',
    })
  }

  // Extract the session token from the header
  const token = authHeader.replace('Bearer ', '')

  try {
    const session = await client.sessions.verifySession(token, token)

    if (!session || !session.userId) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized - Invalid session',
      })
    }

    return session.userId
  } catch (error) {
    console.error('Session verification failed:', error)
    throw createError({
      statusCode: 401,
      message: 'Unauthorized - Session verification failed',
    })
  }
}
