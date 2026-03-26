import { auth } from '@/auth'

export async function requireAuthenticatedOwnerId() {
  const session = await auth()
  const ownerId = session?.user?.email?.trim().toLowerCase()

  if (!ownerId) {
    throw new Error('UNAUTHORIZED')
  }

  return ownerId
}
