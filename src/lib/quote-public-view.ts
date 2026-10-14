type QuoteWithLegacyStatus = { legacyDocumentStatus: unknown }

export function stripLegacyQuoteDocumentStatus<T extends QuoteWithLegacyStatus>(quote: T): Omit<T, 'legacyDocumentStatus'> {
  const publicQuote = { ...quote } as T & { legacyDocumentStatus?: unknown }
  delete publicQuote.legacyDocumentStatus
  return publicQuote as Omit<T, 'legacyDocumentStatus'>
}
