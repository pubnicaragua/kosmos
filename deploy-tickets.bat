@echo off
echo ========================================
echo Sistema Completo de Tickets - Deploy
echo ========================================
echo.

echo [1/6] Agregando archivos al repositorio...
git add -A

echo [2/6] Creando commit...
git commit -m "feat: implementar sistema completo de tickets de soporte con KPIs"

echo [3/6] Subiendo cambios a GitHub...
git push origin main

echo.
echo ========================================
echo Cambios subidos correctamente
echo ========================================
echo.
echo SIGUIENTE PASO: En el servidor ejecuta:
echo.
echo   cd ~/kosmos
echo   git pull origin main
echo   npx prisma generate
echo   npx prisma migrate deploy
echo   npm run build
echo   pm2 restart kosmos-crm
echo.
pause
