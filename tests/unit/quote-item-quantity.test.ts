import assert from 'node:assert/strict'
import test from 'node:test'
import { quoteItemSchema } from '../../src/lib/validations'

const quoteItem = (quantity: number) => ({
  description: 'Cable',
  quantity,
  unitPrice: 1.31,
})

test('accepts positive whole quote quantities', () => {
  const result = quoteItemSchema.safeParse(quoteItem(5))

  assert.equal(result.success, true)
})

test('rejects zero and fractional quote quantities', () => {
  assert.equal(quoteItemSchema.safeParse(quoteItem(0)).success, false)
  assert.equal(quoteItemSchema.safeParse(quoteItem(1.5)).success, false)
})
