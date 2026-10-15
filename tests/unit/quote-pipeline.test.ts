import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLegacyQuotePipelineStage,
  isQuotePipelineTransitionAllowed,
  parseQuotePagination,
  recordQuotePipelineTransition,
} from '../../src/lib/quote-pipeline'

test('allows only the agreed forward and return transitions', () => {
  const allowed: Array<[string, string]> = [
    ['PROSPECTO', 'PROPUESTA'],
    ['PROSPECTO', 'NEGOCIACION'],
    ['PROSPECTO', 'RECHAZADA'],
    ['PROPUESTA', 'NEGOCIACION'],
    ['PROPUESTA', 'REALIZADA'],
    ['PROPUESTA', 'RECHAZADA'],
    ['NEGOCIACION', 'PROPUESTA'],
    ['NEGOCIACION', 'REALIZADA'],
    ['NEGOCIACION', 'RECHAZADA'],
  ]
  const denied: Array<[string, string]> = [
    ['PROSPECTO', 'REALIZADA'],
    ['PROPUESTA', 'PROSPECTO'],
    ['REALIZADA', 'RECHAZADA'],
    ['RECHAZADA', 'REALIZADA'],
  ]

  for (const [from, to] of allowed) {
    assert.equal(isQuotePipelineTransitionAllowed(from, to), true, `${from} -> ${to}`)
  }
  for (const [from, to] of denied) {
    assert.equal(isQuotePipelineTransitionAllowed(from, to), false, `${from} -> ${to}`)
  }
})

test('reopens closed quotes only explicitly and only into negotiation', () => {
  assert.equal(isQuotePipelineTransitionAllowed('REALIZADA', 'NEGOCIACION'), false)
  assert.equal(isQuotePipelineTransitionAllowed('RECHAZADA', 'NEGOCIACION'), false)
  assert.equal(isQuotePipelineTransitionAllowed('REALIZADA', 'NEGOCIACION', true), true)
  assert.equal(isQuotePipelineTransitionAllowed('RECHAZADA', 'NEGOCIACION', true), true)
  assert.equal(isQuotePipelineTransitionAllowed('NEGOCIACION', 'PROPUESTA', true), false)
})

test('maps legacy document statuses conservatively without converting outcomes', () => {
  assert.equal(getLegacyQuotePipelineStage('DRAFT'), 'PROSPECTO')
  assert.equal(getLegacyQuotePipelineStage('SENT'), 'PROPUESTA')
  assert.equal(getLegacyQuotePipelineStage('APPROVED'), 'PROSPECTO')
  assert.equal(getLegacyQuotePipelineStage('REJECTED'), 'PROSPECTO')
  assert.equal(getLegacyQuotePipelineStage('EXPIRED'), 'PROSPECTO')
})

test('accepts only requested quote page sizes and preserves legacy no-pagination calls', () => {
  assert.equal(parseQuotePagination(null, null), null)
  assert.deepEqual(parseQuotePagination('2', '25'), { page: 2, pageSize: 25, skip: 25 })
  assert.deepEqual(parseQuotePagination(null, '50'), { page: 1, pageSize: 50, skip: 0 })
  assert.deepEqual(parseQuotePagination('1', '100'), { page: 1, pageSize: 100, skip: 0 })
  assert.throws(() => parseQuotePagination('0', '25'), /página inválida/i)
  assert.throws(() => parseQuotePagination('9007199254740991', '100'), /página inválida/i)
  assert.throws(() => parseQuotePagination('1', '30'), /tamaño de página inválido/i)
})

test('rejects page offsets outside Prisma integer range', () => {
  assert.throws(() => parseQuotePagination(String(Number.MAX_SAFE_INTEGER), '25'), /Página inválida/)
})

test('records a permitted stage change with captured actor identity', async () => {
  const calls: Array<{ kind: string; data: unknown }> = []
  const tx = {
    quote: {
      updateMany: async (args: unknown) => {
        calls.push({ kind: 'update', data: args })
        return { count: 1 }
      },
    },
    quoteStageHistory: {
      create: async (args: unknown) => {
        calls.push({ kind: 'history', data: args })
        return args
      },
    },
  }

  await recordQuotePipelineTransition(tx as never, {
    quoteId: 'quote-1',
    fromStage: 'PROPUESTA',
    toStage: 'NEGOCIACION',
    actorId: 'user-1',
    actorName: 'Vendedora Uno',
  })

  assert.equal(calls.length, 2)
  assert.equal(calls[0].kind, 'update')
  assert.equal(calls[1].kind, 'history')
  assert.deepEqual((calls[1].data as any).data, {
    quoteId: 'quote-1',
    fromStage: 'PROPUESTA',
    toStage: 'NEGOCIACION',
    actorId: 'user-1',
    actorName: 'Vendedora Uno',
    source: 'USER',
  })
})

test('records an explicit closed-stage reopening into negotiation', async () => {
  let historyData: unknown
  const tx = {
    quote: { updateMany: async () => ({ count: 1 }) },
    quoteStageHistory: {
      create: async (args: unknown) => {
        historyData = (args as any).data
        return args
      },
    },
  }

  await recordQuotePipelineTransition(tx as never, {
    quoteId: 'quote-2',
    fromStage: 'REALIZADA',
    toStage: 'NEGOCIACION',
    actorId: 'user-2',
    actorName: 'Gerente Dos',
    reopen: true,
  })

  assert.deepEqual(historyData, {
    quoteId: 'quote-2',
    fromStage: 'REALIZADA',
    toStage: 'NEGOCIACION',
    actorId: 'user-2',
    actorName: 'Gerente Dos',
    source: 'USER',
  })
})

test('does not write stage or history when expected stage changed concurrently', async () => {
  let historyWrites = 0
  const tx = {
    quote: { updateMany: async () => ({ count: 0 }) },
    quoteStageHistory: { create: async () => { historyWrites += 1 } },
  }

  await assert.rejects(
    recordQuotePipelineTransition(tx as never, {
      quoteId: 'quote-1',
      fromStage: 'PROPUESTA',
      toStage: 'NEGOCIACION',
      actorId: 'user-1',
      actorName: 'Vendedora Uno',
    }),
    /QUOTE_STAGE_CONFLICT/
  )
  assert.equal(historyWrites, 0)
})

test('rejects illegal stages before writing either record', async () => {
  let updates = 0
  let historyWrites = 0
  const tx = {
    quote: { updateMany: async () => { updates += 1; return { count: 1 } } },
    quoteStageHistory: { create: async () => { historyWrites += 1 } },
  }

  await assert.rejects(
    recordQuotePipelineTransition(tx as never, {
      quoteId: 'quote-1',
      fromStage: 'PROSPECTO',
      toStage: 'REALIZADA',
      actorId: 'user-1',
      actorName: 'Vendedora Uno',
    }),
    /QUOTE_STAGE_TRANSITION_NOT_ALLOWED/
  )
  assert.equal(updates, 0)
  assert.equal(historyWrites, 0)
})
