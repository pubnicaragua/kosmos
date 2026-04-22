# INSTRUCCIONES URGENTES PARA SERVIDOR

## ⚠️ ERROR 500 EN /api/employees

**Causa:** Servidor NO ejecutó `npx prisma generate` después del último deploy

## 🚀 EJECUTAR AHORA MISMO EN SERVIDOR:

```bash
ssh extel@186.1.56.251 -p 1510
cd ~/kosmos
git pull origin main
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart kosmos-crm
pm2 logs kosmos-crm --lines 50
```

**Esto resolverá:**
- ✅ Employee API 500 error
- ✅ Activará modelos Department y UserDepartment
- ✅ Activará campos nuevos en PurchaseRequest
- ✅ Sistema 100% funcional

**Tiempo estimado:** 5-10 minutos

---

## ⚠️ IMPORTANTE

Sin ejecutar estos comandos, el sistema NO funcionará correctamente porque:
1. El cliente Prisma no tiene los nuevos modelos generados
2. Las migraciones de BD no están aplicadas
3. Los nuevos campos no existen en la BD

**EJECUTAR AHORA MISMO**
