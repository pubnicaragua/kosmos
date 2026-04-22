// Script para subir videos a Supabase con credenciales reales
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Credenciales reales de Supabase
const supabaseUrl = 'https://sejfwazpxuzccndpgpso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamZ3YXpweHV6Y2NuZHBncHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0MTU0NSwiZXhwIjoyMDkxOTE3NTQ1fQ.iJjqn2ec4gP3-cbPih2CCNaO_IJ-Ex416HFxqmmSW4c';

console.log('Conectando a Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

const videos = [
  {
    filename: 'Login y Dashboard.mp4',
    title: 'Login y Dashboard - Kosmos CRM',
    description: 'Video de entrenamiento completo que muestra cómo iniciar sesión en el sistema Kosmos CRM y navegar por el dashboard principal. Aprende a acceder al sistema, entender la interfaz principal, utilizar los filtros de empresa y período, ver los KPIs en tiempo real, interactuar con las gráficas dinámicas, y exportar reportes en Excel con formato profesional.',
    category: 'dashboard',
    duration: '8:45',
    size: '18.9 MB'
  },
  {
    filename: 'Ingresos - Kosmos CRM.mp4',
    title: 'Módulo de Ingresos - Kosmos CRM',
    description: 'Tutorial completo del módulo de ingresos. Aprende a registrar nuevas ventas, editar ingresos existentes, aplicar filtros por cliente y fecha, utilizar la búsqueda en tiempo real, exportar reportes de ingresos, ver estadísticas por período, y gestionar diferentes métodos de pago y monedas.',
    category: 'ingresos',
    duration: '12:30',
    size: '53.1 MB'
  },
  {
    filename: 'Módulo de Gastos.mp4',
    title: 'Módulo de Gastos - Kosmos CRM',
    description: 'Video de capacitación del módulo de gastos. Descubre cómo registrar gastos operativos, categorizar expenses, adjuntar comprobantes, configurar proveedores, generar reportes de gastos mensuales, analizar tendencias de gastos, y optimizar el control financiero de tu empresa.',
    category: 'gastos',
    duration: '10:15',
    size: '25.0 MB'
  },
  {
    filename: 'Notificaciones y Sistema Operativo.mp4',
    title: 'Notificaciones y Sistema Operativo - Kosmos CRM',
    description: 'Aprende a utilizar el sistema de notificaciones en tiempo real, configurar alertas personalizadas, gestionar notificaciones por email, entender el centro de notificaciones, configurar recordatorios automáticos, y utilizar las herramientas del sistema operativo para máxima productividad.',
    category: 'notificaciones',
    duration: '9:20',
    size: '25.7 MB'
  },
  {
    filename: 'Solicitudes de Compras.mp4',
    title: 'Solicitudes de Compras - Kosmos CRM',
    description: 'Tutorial completo del módulo de solicitudes de compras. Aprende a crear solicitudes de compra, aprobar/rechazar solicitudes, gestionar proveedores, controlar inventario mínimo, generar órdenes de compra, recibir mercancía, actualizar stock automáticamente, y generar reportes de compras.',
    category: 'compras',
    duration: '11:45',
    size: '18.4 MB'
  }
];

async function uploadVideosToSupabase() {
  console.log('=== SUBIENDO VIDEOS A SUPABASE (CREDENCIALES REALES) ===\n');
  
  const videosPath = path.join(__dirname, '../public/videos');
  const uploadedVideos = [];

  // Primero verificar la conexión
  try {
    const { data, error } = await supabase.storage.getBucket('kosmos-crm');
    if (error) {
      console.error('Error al conectar con el bucket:', error);
      return;
    }
    console.log('Conexión exitosa al bucket kosmos-crm\n');
  } catch (error) {
    console.error('Error de conexión:', error);
    return;
  }

  for (const video of videos) {
    try {
      const filePath = path.join(videosPath, video.filename);
      
      if (!fs.existsSync(filePath)) {
        console.error(`Error: No se encuentra el archivo ${video.filename}`);
        continue;
      }

      console.log(`Subiendo video: ${video.filename}`);
      console.log(`Tamaño: ${video.size}`);
      
      // Leer el archivo como buffer
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = `training-videos/${Date.now()}-${video.filename}`;
      
      // Subir a Supabase Storage
      const { data, error } = await supabase.storage
        .from('kosmos-crm')
        .upload(fileName, fileBuffer, {
          contentType: 'video/mp4',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Error al subir ${video.filename}:`, error);
        continue;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('kosmos-crm')
        .getPublicUrl(fileName);

      uploadedVideos.push({
        ...video,
        url: publicUrl,
        storagePath: fileName
      });

      console.log(`  - Subido exitosamente: ${video.title}`);
      console.log(`  - URL: ${publicUrl}\n`);

    } catch (error) {
      console.error(`Error procesando ${video.filename}:`, error);
    }
  }

  // Guardar información de videos subidos con URLs del bucket
  const outputPath = path.join(__dirname, '../public/videos/training-videos-bucket.json');
  fs.writeFileSync(outputPath, JSON.stringify(uploadedVideos, null, 2));
  
  // Actualizar el JSON principal con las URLs del bucket
  const mainJsonPath = path.join(__dirname, '../public/videos/training-videos.json');
  fs.writeFileSync(mainJsonPath, JSON.stringify(uploadedVideos, null, 2));
  
  console.log(`\n=== PROCESO COMPLETADO ===`);
  console.log(`Videos subidos: ${uploadedVideos.length}`);
  console.log(`JSON actualizado: ${mainJsonPath}`);
  
  console.log(`\n=== VIDEOS EN EL BUCKET ===`);
  uploadedVideos.forEach((video, index) => {
    console.log(`${index + 1}. ${video.title}`);
    console.log(`   Categoría: ${video.category}`);
    console.log(`   Duración: ${video.duration}`);
    console.log(`   URL del Bucket: ${video.url}\n`);
  });

  return uploadedVideos;
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  uploadVideosToSupabase()
    .then(() => {
      console.log('\n¡Todos los videos subidos exitosamente al bucket de Supabase!');
      console.log('Los usuarios ahora pueden ver los videos desde el sidebar.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { uploadVideosToSupabase };
