# Mostrar SKU en la proforma impresa

## Intención

La columna `CODIGO` de la proforma impresa debe mostrar el SKU real del producto. Para líneas antiguas o manuales sin relación guardada, se resuelve por nombre exacto dentro de la empresa si existe un solo producto coincidente. Líneas sin coincidencia única conservan `Item NN`.

## Alcance y restricciones

- La vista de impresión usa la relación `QuoteItem.productId`; la cotización guarda descripción y vínculo, no una copia del SKU.
- La API de detalle debe incluir `product.sku` junto al nombre actual del producto.
- Para items sin relación, buscar por nombre exacto sin distinguir mayúsculas y `companyId`; asociar en la respuesta solo si hay una coincidencia única.
- Preservar espacios del nombre al buscar para no asociar una descripción a otro producto con nombre distinto.
- No inferir SKU cuando no haya coincidencia o existan varios productos con el mismo nombre.
- Aprobar descuentos no debe descartar la relación de producto ya cargada en el detalle.
- SKU largos deben ajustarse dentro de la columna `CODIGO`.
- La salida atendida es la proforma impresa/guardada como PDF desde el botón `IMPRIMIR / GUARDAR PDF`, que coincide con la captura.
- Sin migración ni cambio del modelo de datos.
- No modificar el PDF alternativo generado al abrir el flujo de correo; ese formato no tiene columna `CODIGO`.

## Enfoques

1. Leer el SKU actual por relación y, para items sin relación, hacer una búsqueda exacta sin distinguir mayúsculas, limitada por empresa; asociar solo coincidencia única. Elegido por el usuario: resuelve casos antiguos sin migración y evita elegir entre productos ambiguos.
2. Guardar una copia histórica de SKU en cada línea de cotización. Preserva el código que existía al crear la proforma, pero requiere esquema, migración y cambios de escritura.

## Cambios propuestos

- En `src/app/api/quotes/[id]/route.ts`, incluir `sku` en la selección del producto relacionado y resolver items sin relación solo por nombre exacto único dentro de la empresa, ignorando mayúsculas.
- En `src/app/(dashboard)/clientes/cotizacion/[id]/page.tsx`, renderizar `item.product.sku` en `CODIGO`, con `Item NN` como fallback; conservar los items existentes al aplicar respuesta de aprobación y permitir quiebre de SKU largo dentro de la celda.
- Mantener descripción, precios, cantidades y demás diseño sin cambios.

## Aprobación

Enfoque 1 y diseño aprobados por el usuario antes de implementar.
