import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildUserNameHistoryTransition,
  isAllowedToRenameUser,
  resolveNameForAttribution,
  resolveUserNameAt,
  HISTORICAL_USER_NAME_UNAVAILABLE,
  type UserNameVersion,
} from '../../src/lib/user-identity-history'
import { changeUserNameInTransaction } from '../../src/lib/user-name-history'

const at = (value: string) => new Date(value)

test('resolves the name valid at each event time, including interval boundaries', () => {
  const versions: UserNameVersion[] = [
    { name: 'Nombre anterior', validFrom: at('2026-01-01T00:00:00.000Z'), validTo: at('2026-04-01T12:00:00.000Z') },
    { name: 'Nombre nuevo', validFrom: at('2026-04-01T12:00:00.000Z'), validTo: null },
  ]

  assert.equal(resolveUserNameAt(versions, at('2026-04-01T11:59:59.999Z')), 'Nombre anterior')
  assert.equal(resolveUserNameAt(versions, at('2026-04-01T12:00:00.000Z')), 'Nombre nuevo')
})

test('resolves repeated renames without replacing earlier names', () => {
  const versions: UserNameVersion[] = [
    { name: 'Primero', validFrom: at('2026-01-01T00:00:00.000Z'), validTo: at('2026-02-01T00:00:00.000Z') },
    { name: 'Segundo', validFrom: at('2026-02-01T00:00:00.000Z'), validTo: at('2026-03-01T00:00:00.000Z') },
    { name: 'Tercero', validFrom: at('2026-03-01T00:00:00.000Z'), validTo: null },
  ]

  assert.equal(resolveUserNameAt(versions, at('2026-01-31T23:59:59.999Z')), 'Primero')
  assert.equal(resolveUserNameAt(versions, at('2026-02-28T23:59:59.999Z')), 'Segundo')
  assert.equal(resolveUserNameAt(versions, at('2026-03-01T00:00:00.000Z')), 'Tercero')
})

test('returns null when no version covers an event time', () => {
  const versions: UserNameVersion[] = [
    { name: 'Nombre conocido', validFrom: at('2026-02-01T00:00:00.000Z'), validTo: null },
  ]

  assert.equal(resolveUserNameAt(versions, at('2026-01-31T23:59:59.999Z')), null)
  assert.equal(resolveUserNameAt([], at('2026-02-01T00:00:00.000Z')), null)
})

test('uses the deployment baseline to keep attribution for events before history began', () => {
  const versions: UserNameVersion[] = [
    { name: 'Nombre al desplegar', validFrom: at('2026-10-07T12:00:00.000Z'), validTo: at('2026-10-10T12:00:00.000Z') },
    { name: 'Nombre posterior', validFrom: at('2026-10-10T12:00:00.000Z'), validTo: null },
  ]

  assert.equal(
    resolveNameForAttribution(versions, at('2026-08-01T10:00:00.000Z')),
    'Nombre al desplegar'
  )
  assert.equal(
    resolveNameForAttribution(versions, at('2026-10-07T12:00:00.000Z')),
    'Nombre al desplegar'
  )
  assert.equal(resolveNameForAttribution(versions, at('2026-10-10T12:00:00.000Z')), 'Nombre posterior')
  assert.equal(resolveNameForAttribution(versions, null), HISTORICAL_USER_NAME_UNAVAILABLE)
  assert.equal(resolveNameForAttribution([], at('2026-08-01T10:00:00.000Z')), HISTORICAL_USER_NAME_UNAVAILABLE)
})

test('does not create duplicate history when the normalized name is unchanged', () => {
  const transition = buildUserNameHistoryTransition({
    userId: 'user-1',
    currentName: 'Nombre vigente',
    createdAt: at('2026-01-01T00:00:00.000Z'),
    requestedName: '  Nombre vigente  ',
    changedById: 'admin-1',
    changedAt: at('2026-04-01T12:00:00.000Z'),
    currentVersion: {
      id: 'version-1',
      name: 'Nombre vigente',
      validFrom: at('2026-01-01T00:00:00.000Z'),
      validTo: null,
    },
  })

  assert.deepEqual(transition, { changed: false, name: 'Nombre vigente' })
})

test('closes prior version and starts new version at one boundary', () => {
  const changedAt = at('2026-04-01T12:00:00.000Z')
  const transition = buildUserNameHistoryTransition({
    userId: 'user-1',
    currentName: 'Nombre anterior',
    createdAt: at('2026-01-01T00:00:00.000Z'),
    requestedName: 'Nombre nuevo',
    changedById: 'admin-1',
    changedAt,
    currentVersion: {
      id: 'version-1',
      name: 'Nombre anterior',
      validFrom: at('2026-01-01T00:00:00.000Z'),
      validTo: null,
    },
  })

  assert.deepEqual(transition, {
    changed: true,
    name: 'Nombre nuevo',
    closeVersion: { id: 'version-1', validTo: changedAt },
    newVersion: {
      userId: 'user-1',
      name: 'Nombre nuevo',
      validFrom: changedAt,
      changedById: 'admin-1',
    },
  })
})

test('keeps consecutive versions ordered when two changes share a millisecond', () => {
  const boundary = at('2026-04-01T12:00:00.000Z')
  const transition = buildUserNameHistoryTransition({
    userId: 'user-1',
    currentName: 'Nombre anterior',
    createdAt: at('2026-01-01T00:00:00.000Z'),
    requestedName: 'Nombre nuevo',
    changedById: 'admin-1',
    changedAt: boundary,
    currentVersion: {
      id: 'version-1',
      name: 'Nombre anterior',
      validFrom: boundary,
      validTo: null,
    },
  })

  assert.equal(transition.changed, true)
  if (transition.changed) {
    assert.equal(transition.closeVersion?.validTo.getTime(), boundary.getTime() + 1)
    assert.equal(transition.newVersion.validFrom.getTime(), boundary.getTime() + 1)
  }
})

test('requires an admin and an active target membership in selected company', () => {
  assert.equal(isAllowedToRenameUser('SUPER_ADMIN', true), true)
  assert.equal(isAllowedToRenameUser('ADMIN', true), true)
  assert.equal(isAllowedToRenameUser('SUPER_ADMIN', false), false)
})

function makeTransactionFixture(withInitialVersion = true, isActive = true) {
  const user = {
    id: 'user-1',
    name: 'Nombre anterior',
    email: 'institucional@example.org',
    password: 'password-hash',
    isActive,
    createdAt: at('2026-01-01T00:00:00.000Z'),
  }
  const versions: Array<UserNameVersion & { id: string; userId: string; changedById: string | null }> = withInitialVersion
    ? [{
        id: 'version-1',
        userId: user.id,
        name: user.name,
        validFrom: user.createdAt,
        validTo: null,
        changedById: null,
      }]
    : []
  let currentUser = { ...user }
  let nextId = 2

  const tx = {
    user: {
      findUnique: async () => currentUser,
      update: async ({ data }: { data: { name: string } }) => {
        currentUser = { ...currentUser, ...data }
        return currentUser
      },
    },
    userNameHistory: {
      findFirst: async () => versions.filter((version) => version.validTo === null).sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0] || null,
      updateMany: async ({ data }: { data: { validTo: Date } }) => {
        for (const version of versions) {
          if (version.validTo === null) version.validTo = data.validTo
        }
        return { count: 1 }
      },
      create: async ({ data }: { data: Omit<(typeof versions)[number], 'id'> }) => {
        versions.push({ ...data, id: `version-${nextId++}` })
        return versions[versions.length - 1]
      },
    },
  }

  return { tx, versions, getUser: () => currentUser }
}

test('persists old and new names atomically with actor and shared boundary', async () => {
  const { tx, versions, getUser } = makeTransactionFixture()
  const changedAt = at('2026-04-01T12:00:00.000Z')

  const result = await changeUserNameInTransaction(tx as never, {
    userId: 'user-1',
    name: 'Nombre nuevo',
    changedById: 'admin-1',
    changedAt,
  })

  assert.equal(result.changed, true)
  assert.equal(getUser().name, 'Nombre nuevo')
  assert.equal(getUser().email, 'institucional@example.org')
  assert.equal(getUser().password, 'password-hash')
  assert.equal(versions.length, 2)
  assert.equal(versions[0].validTo?.getTime(), changedAt.getTime())
  assert.equal(versions[1].name, 'Nombre nuevo')
  assert.equal(versions[1].validFrom.getTime(), changedAt.getTime())
  assert.equal(versions[1].changedById, 'admin-1')
})

test('does not invent a historical interval when a legacy user lacks a baseline', async () => {
  const { tx, versions } = makeTransactionFixture(false)
  const changedAt = at('2026-04-01T12:00:00.000Z')

  await changeUserNameInTransaction(tx as never, {
    userId: 'user-1',
    name: 'Nombre nuevo',
    changedById: 'admin-1',
    changedAt,
  })

  assert.equal(versions.length, 1)
  assert.equal(versions[0].name, 'Nombre nuevo')
  assert.equal(versions[0].validFrom.getTime(), changedAt.getTime())
})

test('does not rename an inactive account', async () => {
  const { tx, versions, getUser } = makeTransactionFixture(true, false)

  await assert.rejects(
    changeUserNameInTransaction(tx as never, {
      userId: 'user-1',
      name: 'Nombre modificado',
      changedById: 'admin-1',
    }),
    { message: 'USER_INACTIVE' }
  )
  assert.equal(getUser().name, 'Nombre anterior')
  assert.equal(versions.length, 1)
})
