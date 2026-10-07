import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  buildUserNameHistoryTransition,
  resolveNameForAttribution,
  type UserNameVersion,
} from '@/lib/user-identity-history'

type UserHistoryTransaction = Prisma.TransactionClient

export async function ensureInitialUserNameHistory(
  tx: UserHistoryTransaction,
  user: { id: string; name: string; createdAt: Date }
) {
  const currentVersion = await tx.userNameHistory.findFirst({
    where: { userId: user.id, validTo: null },
    select: { id: true },
  })
  if (currentVersion) return

  await tx.userNameHistory.create({
    data: {
      userId: user.id,
      name: user.name,
      validFrom: user.createdAt,
    },
  })
}

export async function changeUserNameInTransaction(
  tx: UserHistoryTransaction,
  input: { userId: string; name: string; changedById: string; changedAt?: Date }
) {
  const requestedName = input.name.trim()
  if (!requestedName) throw new Error('USER_NAME_REQUIRED')

  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, createdAt: true, isActive: true },
  })
  if (!user) throw new Error('USER_NOT_FOUND')
  if (!user.isActive) throw new Error('USER_INACTIVE')

  const changedAt = input.changedAt ?? new Date()
  const currentVersion = await tx.userNameHistory.findFirst({
    where: { userId: user.id, validTo: null },
    orderBy: { validFrom: 'desc' },
    select: { id: true, name: true, validFrom: true, validTo: true, changedById: true },
  })

  const transition = buildUserNameHistoryTransition({
    userId: user.id,
    currentName: user.name,
    createdAt: user.createdAt,
    requestedName,
    changedById: input.changedById,
    changedAt,
    currentVersion,
  })
  if (!transition.changed) return { ...user, changed: false }

  if (transition.closeVersion) {
    await tx.userNameHistory.updateMany({
      where: { userId: user.id, validTo: null },
      data: { validTo: changedAt },
    })
  }

  await tx.userNameHistory.create({ data: transition.newVersion })
  const updated = await tx.user.update({
    where: { id: user.id },
    data: { name: transition.name },
    select: { id: true, name: true, createdAt: true },
  })

  return { ...updated, changed: true }
}

export interface UserNameAttribution {
  userId: string | null | undefined
  occurredAt: Date | null | undefined
}

export async function resolveHistoricalUserNames(attributions: readonly UserNameAttribution[]) {
  const userIds = [...new Set(attributions.map((item) => item.userId).filter((id): id is string => Boolean(id)))]
  if (userIds.length === 0) return attributions.map(() => null)

  const versions = await prisma.userNameHistory.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, name: true, validFrom: true, validTo: true },
    orderBy: { validFrom: 'asc' },
  })

  const versionsByUser = new Map<string, UserNameVersion[]>()
  for (const version of versions) {
    const userVersions = versionsByUser.get(version.userId) || []
    userVersions.push(version)
    versionsByUser.set(version.userId, userVersions)
  }
  return attributions.map(({ userId, occurredAt }) => {
    if (!userId) return null
    return resolveNameForAttribution(versionsByUser.get(userId) || [], occurredAt)
  })
}
