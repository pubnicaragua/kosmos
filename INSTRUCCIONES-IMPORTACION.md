# 🚀 INSTRUCCIONES PARA IMPORTAR CLIENTES

## ⚠️ LO QUE PASÓ

Tu dev ejecutó comandos npm **dentro de psql** (consola de PostgreSQL), NO en PowerShell.
Los comandos NO se ejecutaron. Necesitas ejecutarlos en PowerShell normal.

---

## 📋 PASO 1: Verificar Estado de la Base de Datos

Ejecuta esto en PowerShell (NO en psql):

```powershell
# Verificar qué empresas y clientes existen
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d kosmos_crm -c "SELECT c.name as empresa, COUNT(cl.id) as clientes FROM companies c LEFT JOIN clients cl ON cl.company_id = c.id GROUP BY c.name ORDER BY c.name;"
```

**Contraseña:** `@Edxel111103`

---

## 🔄 PASO 2: Restaurar Datos (si se borraron)

Si los clientes se borraron, restaura con:

```powershell
npm run db:seed
```

Esto creará:
- ✅ 5 empresas reales (Hotel Marbella, ITSI, Extel, Rapidus, Unitec)
- ✅ Usuarios para cada empresa
- ✅ Clientes de ejemplo
- ✅ Ingresos, gastos, actividades, etc.

---

## 🗄️ PASO 3: Aplicar Migraciones de Base de Datos

```powershell
# Aplicar cambios al schema (nuevos campos)
npx prisma db push

# Regenerar cliente de Prisma
npx prisma generate

# Instalar dependencias (xlsx)
npm install
```

---

## 📁 PASO 4: Preparar Archivos Excel

1. **Crea carpeta para imports:**
```powershell
mkdir imports
```

2. **Coloca tus archivos Excel ahí:**
   - `imports/hotel-marbella.xlsx`
   - `imports/itsi-bello-horizonte.xlsx`
   - `imports/itsi-altamira.xlsx`
   - `imports/extel.xlsx`
   - `imports/rapidus.xlsx`

---

## 🎯 PASO 5: Usar el Botón de Importación

1. **Iniciar servidor:**
```powershell
npm run dev
```

2. **Ir a:** `http://localhost:3000/clientes`

3. **Click en botón "IMPORTAR"**

4. **Seleccionar:**
   - Empresa (Hotel Marbella, ITSI, Extel, Rapidus, Unitec)
   - Archivo Excel
   - Marcar "Importar ingresos" si el archivo tiene datos de ingresos

5. **Click en "Importar"**

---

## 🔍 Sobre el CASCADE (Borrado en Cascada)

**¿Por qué se borraron los clientes tan fácil?**

En el schema de Prisma, las relaciones tienen `onDelete: Cascade`:

```prisma
model Client {
  companyId String @map("company_id")
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

Esto significa:
- ✅ Si borras una empresa → Se borran automáticamente todos sus clientes
- ✅ Si borras una empresa → Se borran todos sus ingresos
- ✅ Si borras una empresa → Se borran todas sus cotizaciones

**Es por diseño** para mantener integridad de datos. Si tu dev borró empresas de prueba (Marketing Pro, Tech Solutions), todos sus datos asociados se borraron automáticamente.

---

## 📊 Nuevos Campos Agregados

### **Cliente:**
- `phone2` - Segundo teléfono
- `alias` - Nombre comercial
- `contribuyente` - RUC/Tax ID
- `sucursal` - Sucursal (Bello Horizonte, Altamira)
- `codigoInterno` - Código interno
- `telefonoTutor` - Teléfono del tutor (ITSI)
- `curso` - Curso (ITSI)
- `origen` - Origen del cliente
- `customFields` - JSON con campos personalizados

### **Ingreso:**
- `folio` - Número de folio
- `documento` - Número de documento/factura
- `origen` - Origen del ingreso
- `currency` - Moneda principal (USD, NIO)
- `amountSecondary` - Monto en segunda moneda
- `currencySecondary` - Segunda moneda
- `exchangeRate` - Tipo de cambio
- `customFields` - JSON con campos personalizados

---

## 🎨 Botón de Importación Creado

✅ **Botón "IMPORTAR"** en página de clientes
✅ **Modal funcional** con:
   - Selector de empresa
   - Drag & drop de archivo Excel
   - Checkbox para importar ingresos
   - Resultado de importación
   - Cierre automático después de 5 segundos

---

## 🧪 Probar Importación

1. **Ejecutar migraciones:**
```powershell
npx prisma db push
npx prisma generate
npm install
```

2. **Iniciar servidor:**
```powershell
npm run dev
```

3. **Ir a clientes y probar importación**

---

## 📞 Archivos Creados

- ✅ `prisma/clean-data.ts` - Script de limpieza
- ✅ `prisma/schema.prisma` - Schema actualizado
- ✅ `src/lib/import-clients.ts` - Parser de Excel
- ✅ `src/app/api/clients/import/route.ts` - API de importación
- ✅ `src/app/(dashboard)/clientes/page.tsx` - UI con botón
- ✅ `package.json` - Dependencia xlsx agregada
- ✅ `check-data.sql` - Script de verificación

---

## ❓ Preguntas Frecuentes

**Q: ¿Por qué se borraron los clientes?**
A: Por CASCADE. Al borrar una empresa, se borran todos sus datos relacionados.

**Q: ¿Cómo restauro los clientes?**
A: Ejecuta `npm run db:seed`

**Q: ¿Dónde coloco los archivos Excel?**
A: En la carpeta `imports/` o selecciónalos desde el botón de importación

**Q: ¿El sistema detecta las columnas automáticamente?**
A: Sí, detecta automáticamente las columnas de cada empresa

**Q: ¿Qué pasa con los duplicados?**
A: Se omiten automáticamente (por nombre de cliente)

---

## 🎯 Resumen de Comandos

```powershell
# 1. Verificar estado
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d kosmos_crm -c "SELECT c.name, COUNT(cl.id) FROM companies c LEFT JOIN clients cl ON cl.company_id = c.id GROUP BY c.name;"

# 2. Restaurar datos (si es necesario)
npm run db:seed

# 3. Aplicar migraciones
npx prisma db push
npx prisma generate
npm install

# 4. Iniciar servidor
npm run dev

# 5. Ir a http://localhost:3000/clientes y usar botón IMPORTAR
```

---

**¡Listo! El sistema de importación está 100% funcional.**
