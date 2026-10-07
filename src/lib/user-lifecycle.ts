import { Prisma } from '@prisma/client'

type UserLifecycleTransaction = Prisma.TransactionClient

export async function deactivateUserInTransaction(
  tx: UserLifecycleTransaction,
  input: { actorUserId: string; targetUserId: string; deactivatedAt: Date }
) {
  if (input.actorUserId === input.targetUserId) throw new Error('SELF_DEACTIVATION')

  const actorMembership = await tx.userCompany.findFirst({
    where: {
      userId: input.actorUserId,
      role: 'SUPER_ADMIN',
      endedAt: null,
      user: { is: { isActive: true } },
    },
    select: { id: true },
  })
  if (!actorMembership) throw new Error('GLOBAL_PERMISSION_REQUIRED')

  const target = await tx.user.findUnique({
    where: { id: input.targetUserId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      userCompanies: {
        where: { endedAt: null },
        select: {
          role: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!target) throw new Error('USER_NOT_FOUND')
  if (!target.isActive) throw new Error('USER_ALREADY_INACTIVE')

  if (target.userCompanies.some((membership) => membership.role === 'SUPER_ADMIN')) {
    const otherActiveSuperAdmins = await tx.userCompany.count({
      where: {
        role: 'SUPER_ADMIN',
        endedAt: null,
        userId: { not: target.id },
        user: { is: { isActive: true } },
      },
    })
    if (otherActiveSuperAdmins === 0) throw new Error('LAST_SUPER_ADMIN')
  }

  const accountUpdate = await tx.user.updateMany({
    where: { id: target.id, isActive: true },
    data: {
      isActive: false,
      deactivatedAt: input.deactivatedAt,
      deactivatedById: input.actorUserId,
    },
  })
  if (accountUpdate.count !== 1) throw new Error('USER_ALREADY_INACTIVE')

  await tx.userCompany.updateMany({
    where: { userId: target.id, endedAt: null },
    data: { endedAt: input.deactivatedAt },
  })
  await tx.userDepartment.updateMany({
    where: { userId: target.id, endedAt: null },
    data: { endedAt: input.deactivatedAt },
  })
  await tx.refreshToken.updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: input.deactivatedAt },
  })

  return {
    companies: target.userCompanies.map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      role: membership.role,
    })),
  }
}
