import assert from 'node:assert/strict'
import test from 'node:test'
import { clearQuoteItemProductSelection } from '../../src/lib/quote-item-selection'

test('clears prior quantity and price when replacing a selected product', () => {
  const item = {
    tempId: 1,
    productId: 'product-a',
    description: 'Producto anterior',
    sku: 'OLD-1',
    stock: 24,
    quantity: 5,
    unitPrice: 90.78,
    discount: 10,
    tax: 15,
    total: 471.06,
    baseCost: 70,
    basePublic: 90.78,
    baseMin: 80,
    baseDist: 75,
  }

  assert.deepEqual(clearQuoteItemProductSelection(item), {
    ...item,
    productId: '',
    description: '',
    sku: '',
    stock: null,
    quantity: '',
    unitPrice: '',
    total: 0,
    baseCost: undefined,
    basePublic: undefined,
    baseMin: undefined,
    baseDist: undefined,
  })
})
