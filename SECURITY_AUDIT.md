# Auditoría de Seguridad - KosmosCRM VPS

## Información del Servidor
- **IP Externa**: 186.1.56.251
- **Puerto SSH**: 1510
- **Usuario**: extel
- **IP Interna**: 10.0.0.40/24
- **OS**: Ubuntu 24.04.3

---

## 1. Verificación de Configuración SSH

```bash
# Verificar configuración SSH
sudo cat /etc/ssh/sshd_config | grep -E "PermitRootLogin|PasswordAuthentication|Port|AllowUsers"

# Verificaciones recomendadas:
# - PermitRootLogin no
# - PasswordAuthentication no (usar solo llaves SSH)
# - Port 1510 (puerto no estándar ✓)
# - AllowUsers extel
```

### Acciones recomendadas:
```bash
# Deshabilitar login root
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# Deshabilitar autenticación por contraseña (solo llaves SSH)
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Reiniciar SSH
sudo systemctl restart sshd
```

---

## 2. Firewall (UFW)

```bash
# Ver estado del firewall
sudo ufw status verbose

# Configuración recomendada:
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 1510/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow 3000/tcp comment 'Next.js App'
sudo ufw enable
```

---

## 3. Verificar Puertos Abiertos

```bash
# Ver puertos escuchando
sudo ss -tulnp

# Verificar con nmap (desde otra máquina)
# nmap -sV -p- 186.1.56.251

# Solo deberían estar abiertos:
# - 1510 (SSH)
# - 80 (HTTP) o 443 (HTTPS)
# - 3000 (Next.js) - idealmente detrás de reverse proxy
```

---

## 4. Actualizaciones de Seguridad

```bash
# Verificar actualizaciones pendientes
sudo apt update
sudo apt list --upgradable

# Instalar actualizaciones de seguridad
sudo apt upgrade -y

# Configurar actualizaciones automáticas de seguridad
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 5. Verificar Usuarios y Permisos

```bash
# Listar usuarios con shell de login
cat /etc/passwd | grep -E '/bin/bash|/bin/sh' | cut -d: -f1

# Verificar usuarios con sudo
sudo cat /etc/sudoers
sudo cat /etc/sudoers.d/*

# Verificar intentos de login fallidos
sudo lastb | head -20

# Verificar logins exitosos recientes
last | head -20
```

---

## 6. Seguridad de la Aplicación Next.js

### Variables de entorno sensibles:
```bash
# Verificar que .env no esté expuesto
cat ~/kosmos/.env | grep -E "DATABASE_URL|JWT_SECRET|JWT_REFRESH_SECRET"

# Las claves JWT deben ser largas y aleatorias (mínimo 32 caracteres)
# DATABASE_URL no debe tener credenciales débiles
```

### Verificar permisos de archivos:
```bash
# .env debe ser solo lectura para el usuario
chmod 600 ~/kosmos/.env
ls -la ~/kosmos/.env

# Directorio de uploads
ls -la ~/kosmos/uploads/
chmod 755 ~/kosmos/uploads/
```

---

## 7. Seguridad de PostgreSQL

```bash
# Verificar que PostgreSQL solo escuche en localhost
sudo cat /etc/postgresql/*/main/postgresql.conf | grep listen_addresses
# Debe ser: listen_addresses = 'localhost'

# Verificar autenticación
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep -v "^#" | grep -v "^$"

# Cambiar contraseña del usuario de BD si es débil
sudo -u postgres psql -c "ALTER USER kosmos_user WITH PASSWORD 'NUEVA_CONTRASEÑA_SEGURA';"
```

---

## 8. Protección contra Ataques Comunes

### Fail2Ban (protección contra fuerza bruta):
```bash
# Instalar fail2ban
sudo apt install fail2ban -y

# Crear configuración
sudo tee /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 1510
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

# Reiniciar fail2ban
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# Ver IPs baneadas
sudo fail2ban-client status sshd
```

---

## 9. Logs y Monitoreo

```bash
# Ver logs de autenticación
sudo tail -100 /var/log/auth.log

# Ver logs de la aplicación
pm2 logs kosmos --lines 50

# Ver logs de nginx (si existe)
sudo tail -50 /var/log/nginx/access.log
sudo tail -50 /var/log/nginx/error.log
```

---

## 10. Headers de Seguridad HTTP

Si usas Nginx como reverse proxy, agregar estos headers:

```nginx
# /etc/nginx/sites-available/kosmos
server {
    # ... configuración existente ...
    
    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;" always;
    
    # Ocultar versión de servidor
    server_tokens off;
}
```

---

## 11. Verificación de Vulnerabilidades en Dependencias

```bash
cd ~/kosmos

# Auditar dependencias npm
npm audit

# Corregir vulnerabilidades automáticamente
npm audit fix

# Ver dependencias desactualizadas
npm outdated
```

---

## 12. Backup y Recuperación

```bash
# Crear script de backup
sudo tee /home/extel/backup_kosmos.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/extel/backups"
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump -U kosmos_user kosmos_db > $BACKUP_DIR/db_$DATE.sql

# Backup de uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/extel/kosmos/uploads/

# Backup de .env
cp /home/extel/kosmos/.env $BACKUP_DIR/env_$DATE

# Eliminar backups mayores a 7 días
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completado: $DATE"
EOF

chmod +x /home/extel/backup_kosmos.sh

# Programar backup diario
(crontab -l 2>/dev/null; echo "0 2 * * * /home/extel/backup_kosmos.sh >> /home/extel/backup.log 2>&1") | crontab -
```

---

## 13. Checklist de Seguridad Rápido

| Item | Estado | Comando de verificación |
|------|--------|------------------------|
| SSH en puerto no estándar | ✅ | Puerto 1510 |
| Root login deshabilitado | ⬜ | `grep PermitRootLogin /etc/ssh/sshd_config` |
| Firewall activo | ⬜ | `sudo ufw status` |
| Fail2ban instalado | ⬜ | `sudo systemctl status fail2ban` |
| Actualizaciones al día | ⬜ | `sudo apt update && apt list --upgradable` |
| PostgreSQL solo localhost | ⬜ | `grep listen_addresses /etc/postgresql/*/main/postgresql.conf` |
| .env con permisos 600 | ⬜ | `ls -la ~/kosmos/.env` |
| JWT secrets seguros | ⬜ | Verificar longitud > 32 caracteres |
| Backups configurados | ⬜ | `crontab -l` |
| npm audit sin críticos | ⬜ | `npm audit` |

---

## 14. Pruebas de Penetración Básicas

### Desde tu máquina local (con permiso):

```bash
# Escaneo de puertos
nmap -sV -p 1-65535 186.1.56.251

# Verificar SSL/TLS (si hay HTTPS)
nmap --script ssl-enum-ciphers -p 443 186.1.56.251

# Verificar headers HTTP
curl -I https://tu-dominio.com

# Verificar vulnerabilidades web comunes
nikto -h https://tu-dominio.com
```

---

## Resumen de Acciones Prioritarias

1. **CRÍTICO**: Deshabilitar login root en SSH
2. **CRÍTICO**: Configurar firewall UFW
3. **ALTO**: Instalar y configurar Fail2ban
4. **ALTO**: Verificar que PostgreSQL solo escuche en localhost
5. **MEDIO**: Configurar backups automáticos
6. **MEDIO**: Ejecutar `npm audit fix`
7. **BAJO**: Agregar headers de seguridad HTTP

---

*Documento generado: 2026-02-27*
*Para ejecutar en VPS: SSH a extel@186.1.56.251 -p 1510*
