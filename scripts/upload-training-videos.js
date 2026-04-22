const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

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

async function uploadVideos() {
  console.log('Iniciando subida de videos de entrenamiento...\n');
  
  const videosPath = path.join(__dirname, '../public/videos');
  const uploadedVideos = [];

  for (const video of videos) {
    try {
      const filePath = path.join(videosPath, video.filename);
      
      if (!fs.existsSync(filePath)) {
        console.error(`Error: No se encuentra el archivo ${video.filename}`);
        continue;
      }

      console.log(`Subiendo video: ${video.filename}`);
      
      // Leer el archivo
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
      console.log(`  - URL: ${publicUrl}`);
      console.log(`  - Tamaño: ${video.size}\n`);

    } catch (error) {
      console.error(`Error procesando ${video.filename}:`, error);
    }
  }

  // Guardar información de videos subidos
  const outputPath = path.join(__dirname, '../public/videos/uploaded-videos.json');
  fs.writeFileSync(outputPath, JSON.stringify(uploadedVideos, null, 2));
  
  console.log(`\nProceso completado:`);
  console.log(`- Videos subidos: ${uploadedVideos.length}`);
  console.log(`- Información guardada en: ${outputPath}`);
  console.log(`\nLista de videos subidos:`);
  uploadedVideos.forEach((video, index) => {
    console.log(`${index + 1}. ${video.title}`);
    console.log(`   Categoría: ${video.category}`);
    console.log(`   Duración: ${video.duration}`);
    console.log(`   URL: ${video.url}\n`);
  });

  return uploadedVideos;
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  uploadVideos()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { uploadVideos };
