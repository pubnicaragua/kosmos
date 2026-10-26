export interface UserNameVersion {
  id?: string
  userId?: string
  name: string
  validFrom: Date
  validTo: Date | null
  changedById?: string | null
}

export const HISTORICAL_USER_NAME_UNAVAILABLE = 'Nombre histórico no disponible'

export function resolveNameForAttribution(
  versions: readonly UserNameVersion[],
  occurredAt: Date | null | undefined
): string | null {
  if (!occurredAt) return HISTORICAL_USER_NAME_UNAVAILABLE

  const nameAtEvent = resolveUserNameAt(versions, occurredAt)
  if (nameAtEvent) return nameAtEvent

  const firstKnownVersion = versions.reduce<UserNameVersion | null>(
    (earliest, version) => !earliest || version.validFrom < earliest.validFrom ? version : earliest,
    null
  )

  // Existing records predate reliable name history. Keep attribution readable
  // with the baseline captured at rollout, without pretending it was verified
  // as the exact name used on the old event date.
  if (firstKnownVersion && occurredAt < firstKnownVersion.validFrom) {
    return firstKnownVersion.name
  }

  return HISTORICAL_USER_NAME_UNAVAILABLE
}

export interface UserNameHistoryTransitionInput {
  userId: string
  currentName: string
  createdAt: Date
  requestedName: string
  changedById: string
  changedAt: Date
  currentVersion?: UserNameVersion | null
}

export type UserNameHistoryTransition =
  | { changed: false; name: string }
  | {
      changed: true
      name: string
      closeVersion?: { id: string; validTo: Date }
      newVersion: {
        userId: string
        name: string
        validFrom: Date
        changedById: string
      }
    }

export function isAllowedToRenameUser(actorRole: string | null | undefined, targetIsActiveMember: boolean) {
  return (actorRole === 'ADMIN' || actorRole === 'SUPER_ADMIN') && targetIsActiveMember
}

export function buildUserNameHistoryTransition(
  input: UserNameHistoryTransitionInput
): UserNameHistoryTransition {
  const name = input.requestedName.trim()
  if (name === input.currentName) return { changed: false, name: input.currentName }

  const previousBoundary = input.currentVersion?.validFrom ?? input.createdAt
  const changedAt = input.changedAt.getTime() <= previousBoundary.getTime()
    ? new Date(previousBoundary.getTime() + 1)
    : input.changedAt

  return {
    changed: true,
    name,
    ...(input.currentVersion?.id
      ? { closeVersion: { id: input.currentVersion.id, validTo: changedAt } }
      : {}),
    newVersion: {
      userId: input.userId,
      name,
      validFrom: changedAt,
      changedById: input.changedById,
    },
  }
}

export function resolveUserNameAt(
  versions: readonly UserNameVersion[],
  occurredAt: Date
): string | null {
  const timestamp = occurredAt.getTime()
  const matchingVersion = versions.find((version) => {
    const startsBeforeOrAtEvent = version.validFrom.getTime() <= timestamp
    const endsAfterEvent = version.validTo === null || timestamp < version.validTo.getTime()
    return startsBeforeOrAtEvent && endsAfterEvent
  })

  return matchingVersion?.name ?? null
}
