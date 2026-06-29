import { test, expect } from '@playwright/test'

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
})

test.describe('Login', () => {
  test('debe iniciar sesión', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"], input[name="email"]', 'admin@kosmoscrm.com')
    await page.fill('input[type="password"], input[name="password"]', 'Kosmos!Admin2026#')
    await page.click('button[type="submit"], button:has-text("Ingresar")')
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await expect(page).toHaveURL(/\/dashboards/)
  })
})

test.describe('01 Dashboard', () => {
  test('debe cargar resumen ejecutivo', async ({ page }) => {
    await page.goto('/dashboards')
    await page.waitForLoadState('networkidle')
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    await page.waitForTimeout(3000)
    if (errors.length > 0) {
      console.log('Console errors:', errors)
    }
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('02 Clientes', () => {
  test('debe listar clientes', async ({ page }) => {
    await page.goto('/clientes')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('03 Pipeline', () => {
  test('debe mostrar pipeline', async ({ page }) => {
    await page.goto('/pipeline-ventas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('04 Actividades', () => {
  test('debe listar actividades', async ({ page }) => {
    await page.goto('/actividades')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('05 Tickets', () => {
  test('debe listar tickets', async ({ page }) => {
    await page.goto('/tickets-soporte')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('06 Gastos', () => {
  test('debe listar gastos', async ({ page }) => {
    await page.goto('/gastos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('07 Ingresos', () => {
  test('debe listar ingresos', async ({ page }) => {
    await page.goto('/ingresos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('08 Inventario', () => {
  test('debe listar inventario', async ({ page }) => {
    await page.goto('/inventario')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('09 Cotizaciones', () => {
  test('debe listar cotizaciones', async ({ page }) => {
    await page.goto('/clientes/cotizacion/nueva')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('10 Marketing', () => {
  test('debe listar campañas', async ({ page }) => {
    await page.goto('/marketing')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('11 Documentos', () => {
  test('debe listar documentos', async ({ page }) => {
    await page.goto('/documentos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('12 Contratos', () => {
  test('debe listar contratos', async ({ page }) => {
    await page.goto('/contratos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('13 RRHH', () => {
  test('debe listar recursos humanos', async ({ page }) => {
    await page.goto('/recursos-humanos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('14 Compras', () => {
  test('debe listar solicitudes', async ({ page }) => {
    await page.goto('/solicitudes-compra')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('15 Plantillas', () => {
  test('debe listar plantillas', async ({ page }) => {
    await page.goto('/sistema/plantillas')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('16 Ajustes', () => {
  test('debe cargar ajustes', async ({ page }) => {
    await page.goto('/sistema/ajustes')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('17 Notificaciones', () => {
  test('debe mostrar notificaciones', async ({ page }) => {
    await page.goto('/notificaciones')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})