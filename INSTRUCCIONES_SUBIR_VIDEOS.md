# INSTRUCCIONES PARA SUBIR VIDEOS DE ENTRENAMIENTO AL SERVIDOR

## ⚠️ PROBLEMA ACTUAL

Los videos nuevos muestran error **404 - Página no encontrada** porque los archivos MP4 físicos NO están en el servidor.

El archivo JSON apunta a las rutas correctas, pero **los archivos de video no existen físicamente**.

---

## 📁 ARCHIVOS QUE NECESITAS SUBIR

Debes tener estos 6 archivos MP4 en tu computadora local:

1. `Módulo de Gastos v2.mp4`
2. `Módulo de Cotizaciones.mp4`
3. `Módulo de Marketing.mp4`
4. `Módulo de Solicitud de Compras v2.mp4`
5. `Módulo de Recursos Humanos.mp4`
6. `Módulo de Ajustes - Plantillas.mp4`

---

## 🚀 OPCIÓN 1: SUBIR VÍA FTP/SFTP (RECOMENDADO)

### Paso 1: Conectar al Servidor
```bash
# Conectar vía SFTP
sftp -P 1510 extel@186.1.56.251

# O usar cliente FTP como FileZilla:
# Host: 186.1.56.251
# Puerto: 1510
# Usuario: extel
# Protocolo: SFTP
```

### Paso 2: Navegar a la Carpeta de Videos
```bash
cd ~/kosmos/public/videos
```

### Paso 3: Subir los Archivos
```bash
# Subir cada archivo (desde tu computadora local)
put "Módulo de Gastos v2.mp4"
put "Módulo de Cotizaciones.mp4"
put "Módulo de Marketing.mp4"
put "Módulo de Solicitud de Compras v2.mp4"
put "Módulo de Recursos Humanos.mp4"
put "Módulo de Ajustes - Plantillas.mp4"
```

### Paso 4: Verificar Permisos
```bash
# Salir de SFTP
exit

# Conectar vía SSH
ssh extel@186.1.56.251 -p 1510

# Dar permisos de lectura
cd ~/kosmos/public/videos
chmod 644 *.mp4

# Verificar que los archivos existen
ls -lh *.mp4
```

---

## 🚀 OPCIÓN 2: SUBIR VÍA SCP (DESDE TU COMPUTADORA)

### Desde Windows (PowerShell)
```powershell
# Navegar a la carpeta donde tienes los videos
cd "C:\ruta\donde\estan\los\videos"

# Subir cada archivo
scp -P 1510 "Módulo de Gastos v2.mp4" extel@186.1.56.251:~/kosmos/public/videos/
scp -P 1510 "Módulo de Cotizaciones.mp4" extel@186.1.56.251:~/kosmos/public/videos/
scp -P 1510 "Módulo de Marketing.mp4" extel@186.1.56.251:~/kosmos/public/videos/
scp -P 1510 "Módulo de Solicitud de Compras v2.mp4" extel@186.1.56.251:~/kosmos/public/videos/
scp -P 1510 "Módulo de Recursos Humanos.mp4" extel@186.1.56.251:~/kosmos/public/videos/
scp -P 1510 "Módulo de Ajustes - Plantillas.mp4" extel@186.1.56.251:~/kosmos/public/videos/
```

---

## 🚀 OPCIÓN 3: USAR FILEZILLA (MÁS FÁCIL)

### Paso 1: Descargar FileZilla
- Descargar de: https://filezilla-project.org/

### Paso 2: Configurar Conexión
- **Host:** `sftp://186.1.56.251`
- **Puerto:** `1510`
- **Usuario:** `extel`
- **Contraseña:** [tu contraseña]

### Paso 3: Subir Archivos
1. Conectar al servidor
2. Navegar en el servidor a: `/home/extel/kosmos/public/videos`
3. Arrastrar los 6 archivos MP4 desde tu computadora
4. Esperar a que termine la transferencia

---

## ✅ VERIFICACIÓN DESPUÉS DE SUBIR

### 1. Verificar en el Servidor
```bash
ssh extel@186.1.56.251 -p 1510
cd ~/kosmos/public/videos
ls -lh *.mp4
```

**Deberías ver:**
```
-rw-r--r-- 1 extel extel  19M Apr 22 16:00 Login y Dashboard.mp4
-rw-r--r-- 1 extel extel  53M Apr 22 16:00 Ingresos - Kosmos CRM.mp4
-rw-r--r-- 1 extel extel  33M Apr 22 16:00 Módulo de Gastos v2.mp4
-rw-r--r-- 1 extel extel  38M Apr 22 16:00 Módulo de Cotizaciones.mp4
-rw-r--r-- 1 extel extel  36M Apr 22 16:00 Módulo de Marketing.mp4
-rw-r--r-- 1 extel extel  42M Apr 22 16:00 Módulo de Solicitud de Compras v2.mp4
-rw-r--r-- 1 extel extel  40M Apr 22 16:00 Módulo de Recursos Humanos.mp4
-rw-r--r-- 1 extel extel  30M Apr 22 16:00 Módulo de Ajustes - Plantillas.mp4
-rw-r--r-- 1 extel extel  26M Apr 22 16:00 Notificaciones y Sistema Operativo.mp4
```

### 2. Verificar en el Navegador
Abrir en tu navegador:
- https://www.kosmoscrm.com/videos/Módulo%20de%20Gastos%20v2.mp4
- https://www.kosmoscrm.com/videos/Módulo%20de%20Cotizaciones.mp4
- https://www.kosmoscrm.com/videos/Módulo%20de%20Marketing.mp4
- https://www.kosmoscrm.com/videos/Módulo%20de%20Solicitud%20de%20Compras%20v2.mp4
- https://www.kosmoscrm.com/videos/Módulo%20de%20Recursos%20Humanos.mp4
- https://www.kosmoscrm.com/videos/Módulo%20de%20Ajustes%20-%20Plantillas.mp4

**Si funcionan:** Deberían reproducirse o descargarse

### 3. Verificar en la Página de Entregables
Ir a: https://www.kosmoscrm.com/entregables

Hacer clic en "Ver Video" de cada nuevo video y verificar que se reproduce correctamente.

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "Permission denied"
```bash
# Conectar al servidor
ssh extel@186.1.56.251 -p 1510

# Dar permisos correctos
cd ~/kosmos/public/videos
chmod 644 *.mp4
chown extel:extel *.mp4
```

### Error: "No such file or directory"
```bash
# Crear la carpeta si no existe
ssh extel@186.1.56.251 -p 1510
mkdir -p ~/kosmos/public/videos
```

### Videos muy pesados (transferencia lenta)
**Opción A:** Comprimir videos antes de subir
- Usar HandBrake o similar
- Formato: MP4 (H.264)
- Calidad: Medium (reduce tamaño sin perder mucha calidad)

**Opción B:** Subir de noche cuando hay menos tráfico de red

---

## 📊 TAMAÑOS ESTIMADOS

Basado en las duraciones, los tamaños aproximados son:

| Video | Duración | Tamaño Estimado |
|-------|----------|-----------------|
| Gastos v2 | 14:20 | ~32 MB |
| Cotizaciones | 16:45 | ~38 MB |
| Marketing | 15:30 | ~36 MB |
| Solicitud Compras v2 | 18:15 | ~42 MB |
| Recursos Humanos | 17:40 | ~40 MB |
| Ajustes - Plantillas | 13:25 | ~30 MB |
| **TOTAL** | **1h 35min** | **~218 MB** |

**Tiempo de transferencia estimado:**
- Con conexión de 10 Mbps: ~3 minutos
- Con conexión de 5 Mbps: ~6 minutos
- Con conexión de 2 Mbps: ~15 minutos

---

## ✅ CHECKLIST FINAL

- [ ] Tengo los 6 archivos MP4 en mi computadora
- [ ] Conecté al servidor vía SFTP/SCP/FileZilla
- [ ] Subí todos los archivos a `/home/extel/kosmos/public/videos/`
- [ ] Verifiqué permisos (chmod 644)
- [ ] Probé abrir los videos directamente en el navegador
- [ ] Probé los videos desde la página de Entregables
- [ ] Todos los videos se reproducen correctamente

---

## 🆘 SI NECESITAS AYUDA

Si tienes problemas para subir los archivos:

1. **Verifica conexión al servidor:**
   ```bash
   ssh extel@186.1.56.251 -p 1510
   ```

2. **Verifica espacio en disco:**
   ```bash
   df -h
   ```

3. **Verifica que Next.js sirve archivos estáticos:**
   Los archivos en `public/` deben ser accesibles directamente vía URL.

---

**Una vez subidos los archivos, los videos funcionarán automáticamente en https://www.kosmoscrm.com/entregables** ✅
