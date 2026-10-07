import assert from 'node:assert/strict'
import test from 'node:test'
import { deactivateUserInTransaction } from '../../src/lib/user-lifecycle'

function makeTransactionFixture(options: {
  targetRole?: string
  otherSuperAdmins?: number
  actorIsSuperAdmin?: boolean
} = {}) {
  const target = {
    id: 'target-1',
    email: 'person@example.org',
    name: 'Persona',
    isActive: true,
    userCompanies: [{
      userId: 'target-1',
      companyId: 'company-1',
      role: options.targetRole ?? 'USER',
      endedAt: null as Date | null,
      company: { id: 'company-1', name: 'Empresa' },
    }],
  }
  const refreshTokens = [{ userId: target.id, revokedAt: null as Date | null }]
  const departmentAssignments = [{ userId: target.id, endedAt: null as Date | null }]
  let isActive = true
  let deactivatedAt: Date | null = null
  let deactivatedById: string | null = null

  const tx = {
    userCompany: {
      findFirst: async () => options.actorIsSuperAdmin === false ? null : ({ id: 'actor-membership' }),
      count: async () => options.otherSuperAdmins ?? 1,
      updateMany: async ({ data }: { data: { endedAt: Date } }) => {
        target.userCompanies.forEach((membership) => { membership.endedAt = data.endedAt })
        return { count: target.userCompanies.length }
      },
    },
    user: {
      findUnique: async () => ({ ...target, isActive }),
      updateMany: async ({ data }: { data: { isActive: boolean; deactivatedAt: Date; deactivatedById: string } }) => {
        isActive = data.isActive
        deactivatedAt = data.deactivatedAt
        deactivatedById = data.deactivatedById
        return { count: 1 }
      },
    },
    refreshToken: {
      updateMany: async ({ data }: { data: { revokedAt: Date } }) => {
        refreshTokens.forEach((token) => { token.revokedAt = data.revokedAt })
        return { count: refreshTokens.length }
      },
    },
    userDepartment: {
      updateMany: async ({ data }: { data: { endedAt: Date } }) => {
        departmentAssignments.forEach((assignment) => { assignment.endedAt = data.endedAt })
        return { count: departmentAssignments.length }
      },
    },
  }

  return {
    tx,
    target,
    refreshTokens,
    departmentAssignments,
    getAccountState: () => ({ isActive, deactivatedAt, deactivatedById }),
  }
}

test('deactivates account, closes memberships, and revokes sessions with actor and timestamp', async () => {
  const fixture = makeTransactionFixture()
  const deactivatedAt = new Date('2026-10-07T12:34:56.000Z')

  const result = await deactivateUserInTransaction(fixture.tx as never, {
    actorUserId: 'admin-1',
    targetUserId: 'target-1',
    deactivatedAt,
  })

  assert.deepEqual(result.companies, [{ id: 'company-1', name: 'Empresa', role: 'USER' }])
  assert.deepEqual(fixture.getAccountState(), {
    isActive: false,
    deactivatedAt,
    deactivatedById: 'admin-1',
  })
  assert.equal(fixture.target.email, 'person@example.org')
  assert.equal(fixture.target.userCompanies[0].endedAt?.getTime(), deactivatedAt.getTime())
  assert.equal(fixture.refreshTokens[0].revokedAt?.getTime(), deactivatedAt.getTime())
  assert.equal(fixture.departmentAssignments[0].endedAt?.getTime(), deactivatedAt.getTime())
})

test('rejects self-deactivation before changing account state', async () => {
  const fixture = makeTransactionFixture()

  await assert.rejects(
    deactivateUserInTransaction(fixture.tx as never, {
      actorUserId: 'target-1',
      targetUserId: 'target-1',
      deactivatedAt: new Date(),
    }),
    { message: 'SELF_DEACTIVATION' }
  )
  assert.equal(fixture.getAccountState().isActive, true)
})

test('protects the last active SUPER_ADMIN', async () => {
  const fixture = makeTransactionFixture({ targetRole: 'SUPER_ADMIN', otherSuperAdmins: 0 })

  await assert.rejects(
    deactivateUserInTransaction(fixture.tx as never, {
      actorUserId: 'admin-1',
      targetUserId: 'target-1',
      deactivatedAt: new Date(),
    }),
    { message: 'LAST_SUPER_ADMIN' }
  )
  assert.equal(fixture.getAccountState().isActive, true)
})

test('requires an active SUPER_ADMIN membership for global deactivation', async () => {
  const fixture = makeTransactionFixture({ actorIsSuperAdmin: false })

  await assert.rejects(
    deactivateUserInTransaction(fixture.tx as never, {
      actorUserId: 'admin-1',
      targetUserId: 'target-1',
      deactivatedAt: new Date(),
    }),
    { message: 'GLOBAL_PERMISSION_REQUIRED' }
  )
  assert.equal(fixture.getAccountState().isActive, true)
})
