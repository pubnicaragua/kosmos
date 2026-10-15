type QuoteItemSelection = {
  productId: string
  description: string
  sku?: string
  stock?: number | null
  quantity: number | ''
  unitPrice: number | string
  total: number
  baseCost?: number
  basePublic?: number
  baseMin?: number
  baseDist?: number
}

export function clearQuoteItemProductSelection<T extends QuoteItemSelection>(item: T): T {
  return {
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
  } as T
}
