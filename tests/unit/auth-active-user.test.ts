import assert from 'node:assert/strict'
import test from 'node:test'
import { generateAccessToken, verifyTokenForActiveUser } from '../../src/lib/auth'

test('accepts a signed access token only when its account is active', async () => {
  const token = generateAccessToken({ userId: 'user-1', email: 'user@example.org' })
  let lookedUpUserId: string | null = null

  const payload = await verifyTokenForActiveUser(token, async (userId) => {
    lookedUpUserId = userId
    return true
  })

  assert.equal(payload?.userId, 'user-1')
  assert.equal(payload?.email, 'user@example.org')
  assert.equal(lookedUpUserId, 'user-1')
})

test('rejects active-token access when account was deactivated', async () => {
  const token = generateAccessToken({ userId: 'user-1', email: 'user@example.org' })
  const payload = await verifyTokenForActiveUser(token, async () => false)

  assert.equal(payload, null)
})

test('rejects invalid tokens before looking up an account', async () => {
  let lookupCount = 0
  const payload = await verifyTokenForActiveUser('invalid-token', async () => {
    lookupCount += 1
    return true
  })

  assert.equal(payload, null)
  assert.equal(lookupCount, 0)
})
