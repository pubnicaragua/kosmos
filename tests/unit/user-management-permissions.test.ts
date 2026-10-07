import assert from 'node:assert/strict'
import test from 'node:test'
import { canChangeMemberPassword } from '../../src/lib/user-management-permissions'

test('allows an active company admin to change a password for a current member in that company', () => {
  assert.equal(canChangeMemberPassword({
    actorRole: 'ADMIN',
    actorCompanyId: 'company-1',
    targetCompanyId: 'company-1',
    targetMembershipActive: true,
    targetRole: 'USER',
  }), true)
})

test('does not allow an admin to change passwords across company boundaries', () => {
  assert.equal(canChangeMemberPassword({
    actorRole: 'ADMIN',
    actorCompanyId: 'company-1',
    targetCompanyId: 'company-2',
    targetMembershipActive: true,
    targetRole: 'USER',
  }), false)
})

test('does not allow password changes when the target membership has ended', () => {
  assert.equal(canChangeMemberPassword({
    actorRole: 'SUPER_ADMIN',
    actorCompanyId: 'company-1',
    targetCompanyId: 'company-1',
    targetMembershipActive: false,
    targetRole: 'USER',
  }), false)
})

test('does not allow company users without an admin role to change member passwords', () => {
  assert.equal(canChangeMemberPassword({
    actorRole: 'USER',
    actorCompanyId: 'company-1',
    targetCompanyId: 'company-1',
    targetMembershipActive: true,
    targetRole: 'USER',
  }), false)
})

test('does not allow a company admin to reset a super admin password', () => {
  assert.equal(canChangeMemberPassword({
    actorRole: 'ADMIN',
    actorCompanyId: 'company-1',
    targetCompanyId: 'company-1',
    targetMembershipActive: true,
    targetRole: 'SUPER_ADMIN',
  }), false)
})

test('allows a super admin to reset a super admin password in the same company', () => {
  assert.equal(canChangeMemberPassword({
    actorRole: 'SUPER_ADMIN',
    actorCompanyId: 'company-1',
    targetCompanyId: 'company-1',
    targetMembershipActive: true,
    targetRole: 'SUPER_ADMIN',
  }), true)
})
