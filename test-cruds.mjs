#!/usr/bin/env node
/**
 * Script de testing para validar CRUDs críticos antes de deploy
 * Ejecutar: node test-cruds.mjs
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@kosmoscrm.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123'

let token = ''
let companyId = ''
let clientId = ''
let quoteId = ''
let ticketId = ''

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(name, passed, details = '') {
  const icon = passed ? '✓' : '✗'
  const color = passed ? 'green' : 'red'
  log(`${icon} ${name}${details ? ': ' + details : ''}`, color)
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(url, { ...options, headers })
    const data = await response.json()
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, error: error.message }
  }
}

// 1. Test Login
async function testLogin() {
  log('\n📝 Testing Login...', 'blue')
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })

  if (result.ok && result.data.success && result.data.data.accessToken) {
    token = result.data.data.accessToken
    logTest('Login', true, 'Token obtenido')
    return true
  } else {
    logTest('Login', false, result.data?.message || 'Sin token')
    return false
  }
}

// 2. Test Get Companies
async function testGetCompanies() {
  log('\n🏢 Testing Get Companies...', 'blue')
  const result = await request('/api/companies')

  if (result.ok && result.data.success && Array.isArray(result.data.data)) {
    companyId = result.data.data[0]?.id
    logTest('Get Companies', true, `${result.data.data.length} empresas encontradas`)
    return true
  } else {
    logTest('Get Companies', false, result.data?.message)
    return false
  }
}

// 3. Test Clients CRUD
async function testClientsCRUD() {
  log('\n👥 Testing Clients CRUD...', 'blue')

  // GET Clients
  const getResult = await request(`/api/clients?companyId=${companyId}`)
  logTest('GET Clients', getResult.ok && getResult.data.success)

  // POST Client
  const postResult = await request('/api/clients', {
    method: 'POST',
    body: JSON.stringify({
      companyId,
      name: 'Test Client ' + Date.now(),
      email: `test${Date.now()}@test.com`,
      phone: '88888888',
      status: 'ACTIVE',
    }),
  })

  if (postResult.ok && postResult.data.success) {
    clientId = postResult.data.data.id
    logTest('POST Client', true, `ID: ${clientId}`)
  } else {
    logTest('POST Client', false, postResult.data?.message)
    return false
  }

  // PUT Client
  const putResult = await request(`/api/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: 'Test Client Updated',
      phone: '99999999',
    }),
  })
  logTest('PUT Client', putResult.ok && putResult.data.success)

  return true
}

// 4. Test Quotes CRUD
async function testQuotesCRUD() {
  log('\n📄 Testing Quotes CRUD...', 'blue')

  if (!clientId) {
    logTest('Quotes CRUD', false, 'No hay clientId para crear cotización')
    return false
  }

  // GET Quotes
  const getResult = await request(`/api/quotes?companyId=${companyId}`)
  logTest('GET Quotes', getResult.ok && getResult.data.success)

  // POST Quote
  const postResult = await request('/api/quotes', {
    method: 'POST',
    body: JSON.stringify({
      quoteNumber: 'TEST-' + Date.now(),
      companyId,
      clientId,
      currency: 'USD',
      paymentMethod: 'CONTADO',
      taxApplies: true,
      items: [
        {
          description: 'Producto Test',
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          total: 100,
        },
      ],
      subtotal: 100,
      tax: 15,
      discount: 0,
      total: 115,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  })

  if (postResult.ok && postResult.data.success) {
    quoteId = postResult.data.data.id
    logTest('POST Quote', true, `ID: ${quoteId}`)
  } else {
    logTest('POST Quote', false, postResult.data?.message)
    return false
  }

  // GET Quote by ID
  const getByIdResult = await request(`/api/quotes/${quoteId}`)
  logTest('GET Quote by ID', getByIdResult.ok && getByIdResult.data.success)

  return true
}

// 5. Test Tickets CRUD
async function testTicketsCRUD() {
  log('\n🎫 Testing Tickets CRUD...', 'blue')

  // GET Tickets
  const getResult = await request(`/api/tickets?companyId=${companyId}`)
  logTest('GET Tickets', getResult.ok && getResult.data.success)

  // POST Ticket
  const postResult = await request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({
      companyId,
      title: 'Test Ticket ' + Date.now(),
      description: 'Descripción de prueba',
      type: 'SOPORTE_REMOTO',
      status: 'NUEVO',
      priority: 'MEDIA',
      clientId,
      hasCharge: true,
      amount: 100,
      currency: 'USD',
    }),
  })

  if (postResult.ok && postResult.data.success) {
    ticketId = postResult.data.data.id
    logTest('POST Ticket', true, `ID: ${ticketId}`)
  } else {
    logTest('POST Ticket', false, postResult.data?.message)
    return false
  }

  // GET Ticket by ID
  const getByIdResult = await request(`/api/tickets/${ticketId}`)
  logTest('GET Ticket by ID', getByIdResult.ok && getByIdResult.data.success)

  // PUT Ticket
  const putResult = await request(`/api/tickets/${ticketId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: 'Test Ticket Updated',
      status: 'EN_PROGRESO',
    }),
  })
  logTest('PUT Ticket', putResult.ok && putResult.data.success)

  return true
}

// 6. Test Ticket Type Enum Validation
async function testTicketTypeEnum() {
  log('\n🔍 Testing Ticket Type Enum Validation...', 'blue')

  // Test con valor inválido (debe fallar)
  const invalidResult = await request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({
      companyId,
      title: 'Test Invalid Type',
      type: 'TIPO_INVALIDO',
      status: 'NUEVO',
      priority: 'MEDIA',
    }),
  })

  logTest(
    'Rechaza tipo inválido',
    !invalidResult.ok || !invalidResult.data.success,
    invalidResult.data?.message || 'Validación correcta'
  )

  // Test con valor válido
  const validResult = await request('/api/tickets', {
    method: 'POST',
    body: JSON.stringify({
      companyId,
      title: 'Test Valid Type',
      type: 'INSTALACION_CAMARAS',
      status: 'NUEVO',
      priority: 'MEDIA',
    }),
  })

  logTest('Acepta tipo válido', validResult.ok && validResult.data.success)

  return true
}

// 7. Test ClientAutocomplete Ordering
async function testClientOrdering() {
  log('\n🔤 Testing Client Alphabetical Ordering...', 'blue')

  const result = await request(`/api/clients?companyId=${companyId}&limit=200`)

  if (result.ok && result.data.success && Array.isArray(result.data.data)) {
    const clients = result.data.data
    const names = clients.map((c) => c.name)
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
    const isOrdered = JSON.stringify(names) === JSON.stringify(sortedNames)

    logTest(
      'Clientes ordenados alfabéticamente',
      isOrdered,
      isOrdered ? 'Correcto' : 'No están ordenados'
    )
    return isOrdered
  } else {
    logTest('Client Ordering', false, 'No se pudieron obtener clientes')
    return false
  }
}

// Main Test Runner
async function runTests() {
  log('🚀 Iniciando Tests de CRUDs Críticos...', 'yellow')
  log(`API URL: ${API_URL}`, 'yellow')

  const results = {
    passed: 0,
    failed: 0,
  }

  try {
    // Login es requerido para todos los tests
    if (!(await testLogin())) {
      log('\n❌ Login falló. No se pueden ejecutar más tests.', 'red')
      process.exit(1)
    }
    results.passed++

    // Get Companies
    if (await testGetCompanies()) results.passed++
    else results.failed++

    // Clients CRUD
    if (await testClientsCRUD()) results.passed++
    else results.failed++

    // Quotes CRUD
    if (await testQuotesCRUD()) results.passed++
    else results.failed++

    // Tickets CRUD
    if (await testTicketsCRUD()) results.passed++
    else results.failed++

    // Ticket Type Enum
    if (await testTicketTypeEnum()) results.passed++
    else results.failed++

    // Client Ordering
    if (await testClientOrdering()) results.passed++
    else results.failed++

    // Summary
    log('\n' + '='.repeat(50), 'yellow')
    log('📊 RESUMEN DE TESTS', 'yellow')
    log('='.repeat(50), 'yellow')
    log(`✓ Tests Pasados: ${results.passed}`, 'green')
    log(`✗ Tests Fallidos: ${results.failed}`, results.failed > 0 ? 'red' : 'green')
    log('='.repeat(50), 'yellow')

    if (results.failed === 0) {
      log('\n🎉 TODOS LOS TESTS PASARON - Sistema listo para deploy!', 'green')
      process.exit(0)
    } else {
      log('\n⚠️  HAY TESTS FALLIDOS - Revisar antes de deploy', 'red')
      process.exit(1)
    }
  } catch (error) {
    log(`\n❌ Error ejecutando tests: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

runTests()
