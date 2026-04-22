# VERIFICACIÓN DE UPLOADS EN TODOS LOS MÓDULOS

## 📋 MÓDULOS A VERIFICAR

### 1. ✅ MARKETING - EVIDENCIA
**Ubicación:** `/marketing/[id]` - Card "Evidencia"
**Estado:** ✅ IMPLEMENTADO
**Funcionalidad:**
- Upload imagen/video/PDF/docs
- Preview automático para imágenes/videos
- Botón "Subir Evidencia" / "Cambiar Evidencia"
- Integración con `/api/upload`

### 2. ⚠️ PIPELINE DE VENTAS
**Ubicación:** `/pipeline-ventas`
**Estado:** REQUIERE VERIFICACIÓN
**Necesita:** Upload de archivos adjuntos en oportunidades

### 3. ⚠️ TICKETS DE SOPORTE
**Ubicación:** `/tickets-soporte/[id]`
**Estado:** REQUIERE VERIFICACIÓN
**Necesita:** Upload de adjuntos en comentarios

### 4. ⚠️ SOLICITUDES DE COMPRA
**Ubicación:** `/solicitudes-compra/[id]`
**Estado:** BACKEND LISTO, FRONTEND PENDIENTE
**Necesita:** 
- Upload cotización
- Upload orden de compra
- Upload evidencia de recepción

---

## 🔍 ANÁLISIS DE UPLOAD API

**Endpoint:** `/api/upload`
**Método:** POST
**Body:** FormData con file
**Response:** `{ success: true, data: { url: string } }`

**Límites:**
- Tamaño máximo: 10MB
- Formatos: Todos (imagen, video, PDF, docs, etc)

---

## ✅ MARKETING UPLOAD - CÓDIGO IMPLEMENTADO

```typescript
// En marketing/[id]/page.tsx - Card Evidencia
const input = document.createElement('input')
input.type = 'file'
input.accept = 'image/*,video/*,.pdf,.doc,.docx'
input.onchange = async (e: any) => {
  const file = e.target?.files?.[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('file', file)
  
  const token = localStorage.getItem('accessToken')
  const uploadRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  const uploadData = await uploadRes.json()
  
  if (uploadData.success) {
    const updateRes = await fetch(`/api/marketing/${params.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ evidenceUrl: uploadData.data.url }),
    })
    const updateData = await updateRes.json()
    
    if (updateData.success) {
      window.location.reload()
    }
  }
}
input.click()
```

---

## 📊 ESTADO ACTUAL

| Módulo | Upload Backend | Upload Frontend | Operativo |
|--------|----------------|-----------------|-----------|
| Marketing | ✅ | ✅ | ✅ |
| Pipeline | ❓ | ❓ | ❓ |
| Tickets | ❓ | ❓ | ❓ |
| Solicitudes | ✅ | ❌ | ❌ |

---

## 🚀 PRÓXIMOS PASOS

1. Verificar Pipeline de Ventas upload
2. Verificar Tickets upload
3. Implementar Solicitudes upload frontend
4. Probar todos los uploads end-to-end
