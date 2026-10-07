import { prisma } from '@/lib/prisma'

export interface UserIdentity {
  id: string
  name: string
  email: string
  avatar: string | null
}

export async function getUserIdentityMap(userIds: readonly (string | null | undefined)[]) {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  const identities = new Map<string, UserIdentity>()
  if (ids.length === 0) return identities

  const [activeUsers, archivedUsers] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true, avatar: true },
    }),
    prisma.archivedUser.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, email: true, avatar: true },
    }),
  ])

  for (const user of activeUsers) identities.set(user.id, user)
  for (const user of archivedUsers) {
    if (!identities.has(user.id)) identities.set(user.id, user)
  }

  return identities
}
