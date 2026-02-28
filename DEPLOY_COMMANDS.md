# Comandos de Despliegue - KOSMOS CRM

## 1. Preparación en el VPS

### Crear directorio para uploads persistentes
```bash
sudo mkdir -p /var/www/kosmos/uploads
sudo chown -R www-data:www-data /var/www/kosmos/uploads
sudo chmod -R 755 /var/www/kosmos/uploads
```

### Configurar Nginx para servir archivos estáticos
Agregar al archivo de configuración de Nginx (`/etc/nginx/sites-available/kosmos`):
```nginx
location /uploads/ {
    alias /var/www/kosmos/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

Reiniciar Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 2. Variables de Entorno (.env)

Agregar o actualizar en el archivo `.env` del proyecto:
```env
# Almacenamiento de archivos en VPS (sin Vercel Blob)
UPLOAD_DIR=/var/www/kosmos/uploads
UPLOAD_BASE_URL=https://tudominio.com/uploads

# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/kosmos_crm"

# JWT
JWT_SECRET="tu_secret_seguro_aqui"
JWT_REFRESH_SECRET="tu_refresh_secret_aqui"
```

## 3. Migración de Base de Datos

### Generar migración de Prisma
```bash
cd /ruta/al/proyecto
npx prisma migrate dev --name add_ticket_currency_and_document_sharing
```

### En producción (aplicar migración sin interacción)
```bash
npx prisma migrate deploy
```

### Generar cliente de Prisma
```bash
npx prisma generate
```

## 4. Despliegue de la Aplicación

### Actualizar código
```bash
cd /var/www/kosmos
git pull origin main
```

### Instalar dependencias
```bash
npm install
```

### Construir aplicación
```bash
npm run build
```

### Reiniciar servicio (PM2)
```bash
pm2 restart kosmos-crm
# o si usas systemd:
sudo systemctl restart kosmos-crm
```

## 5. Verificación

### Verificar que el servicio está corriendo
```bash
pm2 status
# o
sudo systemctl status kosmos-crm
```

### Verificar logs
```bash
pm2 logs kosmos-crm --lines 50
# o
sudo journalctl -u kosmos-crm -f
```

### Probar upload de archivos
```bash
curl -X POST https://tudominio.com/api/upload \
  -H "Authorization: Bearer TU_TOKEN" \
  -F "file=@/path/to/test.jpg"
```

## 6. Cambios en esta Actualización

### Nuevos campos en la base de datos:
- **Ticket**: `assignedUsers` (JSON), `currency` (USD/NIO)
- **Document**: `sharedWith` (JSON para compartir con usuarios específicos)

### Nuevas funcionalidades:
1. **Notificaciones en Pipeline**: Se envían notificaciones automáticas al asignar oportunidades
2. **Selector de moneda en Tickets**: USD ($) o NIO (C$)
3. **Productos del inventario en Cotizaciones**: Selector para agregar productos existentes
4. **Compartir documentos**: Campo para especificar usuarios con acceso
5. **Exportación con logo**: Los reportes Excel incluyen encabezado con nombre de empresa
6. **Almacenamiento VPS**: Archivos se guardan en el servidor en lugar de Vercel Blob

### Archivos modificados principales:
- `prisma/schema.prisma` - Nuevos campos
- `src/app/api/tickets/route.ts` - Soporte currency y assignedUsers
- `src/app/api/opportunities/route.ts` - Notificaciones
- `src/app/api/documents/route.ts` - Compartir documentos
- `src/app/api/upload/route.ts` - Almacenamiento VPS
- `src/app/(dashboard)/tickets-soporte/page.tsx` - UI moneda
- `src/app/(dashboard)/clientes/cotizacion/nueva/page.tsx` - Productos inventario
- `src/lib/export-utils.ts` - Utilidad exportación con logo

## 7. Rollback (si es necesario)

```bash
# Revertir migración
npx prisma migrate resolve --rolled-back add_ticket_currency_and_document_sharing

# Volver a versión anterior
git checkout HEAD~1
npm install
npm run build
pm2 restart kosmos-crm
```
