#!/bin/bash

# ===================================
# Kosmos CRM - Grabación de Videos E2E
# ===================================

BASE_URL="${1:-http://localhost:3000}"

echo "==================================="
echo "Kosmos CRM - Grabación de Módulos"
echo "==================================="
echo "URL base: $BASE_URL"
echo ""

# Exportar para Playwright
export PLAYWRIGHT_BASE_URL="$BASE_URL"

# Asegurar que Playwright está instalado
if ! npx playwright --version > /dev/null 2>&1; then
  echo "Instalando Playwright..."
  npx playwright install chromium
fi

# Crear directorio para videos
mkdir -p playwright-videos

echo "Iniciando grabación de módulos..."
echo ""

# Opción 1: Grabar todos los tests
echo "Ejecutando tests con video..."
npx playwright test modulos.spec.ts --reporter=list --project=chromium

echo ""
echo "==================================="
echo "Videos grabados en: playwright-videos/"
echo "Reportes en: playwright-reports/"
echo "==================================="