# ===================================
# Kosmos CRM - Grabación de Videos E2E (Windows)
# ===================================

$BASE_URL = if ($args[0]) { $args[0] } else { "http://localhost:3000" }

Write-Host "==================================="
Write-Host "Kosmos CRM - Grabación de Módulos"
Write-Host "==================================="
Write-Host "URL base: $BASE_URL"
Write-Host ""

# Exportar para Playwright
$env:PLAYWRIGHT_BASE_URL = $BASE_URL

# Crear directorio para videos
New-Item -ItemType Directory -Force -Path "playwright-videos" | Out-Null

Write-Host "Ejecutando tests con video..."

# Ejecutar tests de módulos
npx playwright test modulos.spec.ts --reporter=list --project=chromium

Write-Host ""
Write-Host "==================================="
Write-Host "Videos grabados en: playwright-videos/"
Write-Host "Reportes en: playwright-reports/"
Write-Host "==================================="