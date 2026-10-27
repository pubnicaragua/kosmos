# Mostrar SKU en la proforma impresa

## Intención

La columna `CODIGO` de la proforma impresa debe mostrar el SKU real del producto vinculado. Las líneas manuales sin producto vinculado conservan un identificador `Item NN`.

## Alcance y restricciones

- La vista de impresión usa la relación `QuoteItem.productId`; la cotización guarda descripción y vínculo, no una copia del SKU.
- La API de detalle debe incluir `product.sku` junto al nombre actual del producto.
- Aprobar descuentos no debe descartar la relación de producto ya cargada en el detalle.
- SKU largos deben ajustarse dentro de la columna `CODIGO`.
- La salida atendida es la proforma impresa/guardada como PDF desde el botón `IMPRIMIR / GUARDAR PDF`, que coincide con la captura.
- Sin migración ni cambio del modelo de datos.
- No modificar el PDF alternativo generado al abrir el flujo de correo; ese formato no tiene columna `CODIGO`.

## Enfoques

1. Leer el SKU actual por la relación del producto y mostrarlo en `CODIGO`; usar `Item NN` si producto o SKU no existe. Elegido por el usuario: resuelve el caso sin migración; la proforma refleja el SKU vigente del catálogo.
2. Guardar una copia histórica de SKU en cada línea de cotización. Preserva el código que existía al crear la proforma, pero requiere esquema, migración y cambios de escritura.

## Cambios propuestos

- En `src/app/api/quotes/[id]/route.ts`, incluir `sku` en la selección del producto relacionado.
- En `src/app/(dashboard)/clientes/cotizacion/[id]/page.tsx`, renderizar `item.product.sku` en `CODIGO`, con `Item NN` como fallback; conservar los items existentes al aplicar respuesta de aprobación y permitir quiebre de SKU largo dentro de la celda.
- Mantener descripción, precios, cantidades y demás diseño sin cambios.

## Aprobación

Enfoque 1 y diseño aprobados por el usuario antes de implementar.
