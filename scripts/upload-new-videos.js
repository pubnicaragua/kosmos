// Script para subir los 6 videos nuevos a Supabase
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sejfwazpxuzccndpgpso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamZ3YXpweHV6Y2NuZHBncHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0MTU0NSwiZXhwIjoyMDkxOTE3NTQ1fQ.iJjqn2ec4gP3-cbPih2CCNaO_IJ-Ex416HFxqmmSW4c';

console.log('🚀 Conectando a Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// SOLO los 6 videos NUEVOS
const newVideos = [
  {
    filename: 'Módulo de Gastos v2.mp4',
    title: 'Módulo de Gastos v2 - Kosmos CRM',
    description: 'Tutorial actualizado del módulo de gastos con las nuevas funcionalidades. Aprende a registrar gastos con múltiples categorías, utilizar la selección masiva de gastos, aplicar edición en lote para actualizar estado y categoría de múltiples gastos simultáneamente, eliminar gastos en masa, adjuntar comprobantes digitales, filtrar por proveedor y método de pago, exportar reportes financieros detallados, y analizar el flujo de caja de tu empresa con gráficas interactivas.',
    category: 'gastos',
    duration: '14:20',
    size: '32.5 MB'
  },
  {
    filename: 'Módulo de Cotizaciones.mp4',
    title: 'Módulo de Cotizaciones - Kosmos CRM',
    description: 'Capacitación completa del módulo de cotizaciones y ventas. Descubre cómo crear cotizaciones profesionales con productos del inventario, calcular automáticamente subtotales e IVA, aplicar descuentos con aprobación, configurar métodos de pago y términos de entrega, enviar cotizaciones por email y WhatsApp, convertir cotizaciones en ventas confirmadas, dar seguimiento al pipeline de ventas, generar reportes de conversión, y exportar cotizaciones en formato PDF con el logo de tu empresa.',
    category: 'cotizaciones',
    duration: '16:45',
    size: '38.2 MB'
  },
  {
    filename: 'Módulo de Marketing.mp4',
    title: 'Módulo de Marketing - Kosmos CRM',
    description: 'Tutorial completo del módulo de marketing digital. Aprende a crear y gestionar campañas de marketing multicanal (redes sociales, email, publicidad digital, contenido, eventos), definir presupuestos y controlar gastos en tiempo real, registrar métricas de rendimiento (impresiones, clics, conversiones, ROI), subir evidencias de campañas (imágenes, videos, PDFs), solicitar aprobación de campañas, analizar el desempeño con gráficas interactivas, exportar reportes de marketing en Excel y PDF, y optimizar tus estrategias con datos reales.',
    category: 'marketing',
    duration: '15:30',
    size: '35.8 MB'
  },
  {
    filename: 'Módulo de Solicitud de Compras v2.mp4',
    title: 'Módulo de Solicitud de Compras v2 - Kosmos CRM',
    description: 'Tutorial actualizado del módulo de solicitudes de compras con workflow completo de aprobación. Aprende a crear solicitudes de compra basadas en stock mínimo, asignar departamentos y aprobadores, establecer prioridades (alta, media, baja), aprobar o rechazar solicitudes con justificación, subir cotizaciones de proveedores, generar órdenes de compra automáticas, adjuntar evidencia de recepción de productos, actualizar inventario automáticamente al recibir mercancía, crear gastos vinculados a compras, imprimir órdenes de compra, y generar reportes de gestión de compras por departamento.',
    category: 'compras',
    duration: '18:15',
    size: '42.1 MB'
  },
  {
    filename: 'Módulo de Recursos Humanos.mp4',
    title: 'Módulo de Recursos Humanos - Kosmos CRM',
    description: 'Capacitación completa del módulo de recursos humanos y gestión de personal. Descubre cómo registrar empleados con información completa (datos personales, contacto de emergencia, tipo de sangre, nivel educativo), importar empleados masivamente desde Excel, gestionar contratos laborales (indefinido, temporal, por proyecto), calcular nóminas automáticamente, registrar beneficios y deducciones, configurar cuentas bancarias para pagos, generar reportes de planilla, exportar datos de empleados, crear gastos de nómina automáticos, y mantener un historial completo del personal de tu empresa.',
    category: 'rrhh',
    duration: '17:40',
    size: '40.3 MB'
  },
  {
    filename: 'Módulo de Ajustes - Plantillas.mp4',
    title: 'Módulo de Ajustes - Plantillas - Kosmos CRM',
    description: 'Tutorial del módulo de ajustes y configuración de plantillas personalizadas. Aprende a acceder al módulo de ajustes del sistema, configurar plantillas de cotizaciones con tu logo y datos empresariales, personalizar plantillas de facturas con términos y condiciones, crear departamentos de la empresa, asignar usuarios a departamentos con roles específicos, designar aprobadores para solicitudes de compra, configurar roles y permisos de usuarios, gestionar múltiples empresas desde una sola cuenta, y personalizar la experiencia del CRM según las necesidades de tu organización.',
    category: 'ajustes',
    duration: '13:25',
    size: '29.7 MB'
  }
];

async function uploadNewVideos() {
  console.log('=== SUBIENDO 6 VIDEOS NUEVOS ===\n');
  
  const videosPath = path.join(__dirname, '../public/videos');
  const uploadedVideos = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < newVideos.length; i++) {
    const video = newVideos[i];
    const filePath = path.join(videosPath, video.filename);
    
    console.log(`[${i + 1}/${newVideos.length}] Procesando: ${video.filename}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`   ❌ ERROR: Archivo no encontrado en: ${filePath}`);
      console.error(`   Por favor coloca el archivo en la carpeta: public/videos/\n`);
      errorCount++;
      continue;
    }

    try {
      // Leer archivo
      const fileBuffer = fs.readFileSync(filePath);
      const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);
      console.log(`   📦 Tamaño: ${fileSizeMB} MB`);
      console.log(`   ⬆️  Subiendo a Supabase...`);
      
      // Sanitizar nombre de archivo (sin espacios ni caracteres especiales)
      const sanitizedName = video.filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
        .replace(/\s+/g, '-') // Espacios a guiones
        .replace(/[^a-zA-Z0-9.-]/g, ''); // Solo alfanuméricos, puntos y guiones
      
      const fileName = `training/${sanitizedName}`;
      
      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, fileBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errorCount++;
        continue;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      uploadedVideos.push({
        ...video,
        url: publicUrl,
        storagePath: fileName
      });

      console.log(`   ✅ Subido exitosamente`);
      console.log(`   🔗 URL: ${publicUrl}\n`);
      successCount++;

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }

  // Leer JSON actual
  const mainJsonPath = path.join(__dirname, '../public/videos/training-videos.json');
  let currentVideos = [];
  
  if (fs.existsSync(mainJsonPath)) {
    currentVideos = JSON.parse(fs.readFileSync(mainJsonPath, 'utf8'));
  }

  // Actualizar solo los videos nuevos en el JSON
  uploadedVideos.forEach(newVideo => {
    const index = currentVideos.findIndex(v => v.filename === newVideo.filename);
    if (index >= 0) {
      currentVideos[index] = newVideo;
    } else {
      currentVideos.push(newVideo);
    }
  });

  // Guardar JSON actualizado
  fs.writeFileSync(mainJsonPath, JSON.stringify(currentVideos, null, 2));
  
  console.log('=== RESULTADO FINAL ===');
  console.log(`✅ Videos subidos exitosamente: ${successCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log(`📄 JSON actualizado: ${mainJsonPath}`);
  console.log('\n🎉 ¡Proceso completado!');
  console.log('Los videos ya están disponibles en: https://www.kosmoscrm.com/entregables\n');

  return uploadedVideos;
}

if (require.main === module) {
  uploadNewVideos()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { uploadNewVideos };
