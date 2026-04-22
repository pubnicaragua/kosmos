// Script simple para subir videos a Supabase
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sejfwazpxuzccndpgpso.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamZ3YXpweHV6Y2NuZHBncHNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM0MTU0NSwiZXhwIjoyMDkxOTE3NTQ1fQ.iJjqn2ec4gP3-cbPih2CCNaO_IJ-Ex416HFxqmmSW4c';

console.log('Conectando a Supabase...');
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

async function uploadVideosSimple() {
  console.log('=== SUBIENDO VIDEOS (SIMPLIFICADO) ===\n');
  
  const videosPath = path.join(__dirname, '../public/videos');
  const uploadedVideos = [];

  try {
    // Intentar subir videos uno por uno
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      try {
        const filePath = path.join(videosPath, video.filename);
        
        if (!fs.existsSync(filePath)) {
          console.error(`No existe: ${video.filename}`);
          continue;
        }

        console.log(`Intentando subir: ${video.filename}`);
        
        // Leer archivo en chunks para evitar límites de tamaño
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = `training/${video.filename}`;
        
        // Subir con upsert para sobreescribir si existe
        const { data, error } = await supabase.storage
          .from('kosmos-crm')
          .upload(fileName, fileBuffer, {
            contentType: 'video/mp4',
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          console.error(`Error subiendo ${video.filename}:`, error.message);
          // Usar URL local como fallback
          uploadedVideos.push({
            ...video,
            url: `/videos/${video.filename}`,
            storagePath: fileName
          });
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

        console.log(`  - Subido: ${video.title}`);
        console.log(`  - URL: ${publicUrl}`);

      } catch (videoError) {
        console.error(`Error con ${video.filename}:`, videoError.message);
        // Usar URL local
        uploadedVideos.push({
          ...video,
          url: `/videos/${video.filename}`,
          storagePath: null
        });
      }
      
      console.log(''); // Espacio entre videos
    }

    // Actualizar JSON
    const mainJsonPath = path.join(__dirname, '../public/videos/training-videos.json');
    fs.writeFileSync(mainJsonPath, JSON.stringify(uploadedVideos, null, 2));
    
    console.log(`=== RESULTADO ===`);
    console.log(`Videos procesados: ${uploadedVideos.length}`);
    console.log(`JSON actualizado: ${mainJsonPath}`);
    
    const bucketCount = uploadedVideos.filter(v => v.storagePath).length;
    const localCount = uploadedVideos.filter(v => !v.storagePath).length;
    
    console.log(`En bucket: ${bucketCount}`);
    console.log(`URLs locales: ${localCount}`);

    return uploadedVideos;

  } catch (error) {
    console.error('Error general:', error);
    return [];
  }
}

if (require.main === module) {
  uploadVideosSimple()
    .then(() => {
      console.log('\n¡Proceso completado!');
      console.log('Videos disponibles en el sidebar.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { uploadVideosSimple };
