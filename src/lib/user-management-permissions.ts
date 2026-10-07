type MemberPasswordChangeAccess = {
  actorRole: string
  actorCompanyId: string
  targetCompanyId: string
  targetMembershipActive: boolean
  targetRole: string
}

export function canChangeMemberPassword({
  actorRole,
  actorCompanyId,
  targetCompanyId,
  targetMembershipActive,
  targetRole,
}: MemberPasswordChangeAccess): boolean {
  return (
    (actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN') &&
    (targetRole !== 'SUPER_ADMIN' || actorRole === 'SUPER_ADMIN') &&
    actorCompanyId.length > 0 &&
    actorCompanyId === targetCompanyId &&
    targetMembershipActive
  )
}
