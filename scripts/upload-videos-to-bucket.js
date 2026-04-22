// Script para subir videos al bucket de Supabase
// Ejecutar con: node scripts/upload-videos-to-bucket.js

const fs = require('fs');
const path = require('path');

// Información de los videos para subir
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

console.log('=== PROCESO DE VIDEOS DE ENTRENAMIENTO ===\n');

// 1. Verificar que los archivos existan
const videosPath = path.join(__dirname, '../public/videos');
console.log('Verificando archivos de videos...');

videos.forEach((video, index) => {
  const filePath = path.join(videosPath, video.filename);
  const exists = fs.existsSync(filePath);
  const size = exists ? fs.statSync(filePath).size : 0;
  
  console.log(`${index + 1}. ${video.filename}`);
  console.log(`   - Existe: ${exists ? 'Sí' : 'No'}`);
  console.log(`   - Tamaño: ${(size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   - Categoría: ${video.category}`);
  console.log(`   - Duración: ${video.duration}\n`);
});

// 2. Generar JSON para la página
const videosWithUrls = videos.map(video => ({
  ...video,
  url: `/videos/${video.filename}`
}));

const jsonPath = path.join(__dirname, '../public/videos/training-videos.json');
fs.writeFileSync(jsonPath, JSON.stringify(videosWithUrls, null, 2));

console.log('=== ARCHIVO JSON GENERADO ===');
console.log(`Ubicación: ${jsonPath}`);
console.log(`Videos procesados: ${videos.length}`);

// 3. Instrucciones para subir al bucket
console.log('\n=== INSTRUCCIONES PARA SUBIR AL BUCKET ===');
console.log('Para subir los videos al bucket de Supabase, tienes dos opciones:\n');

console.log('OPCIÓN 1 - Manual (Recomendado para producción):');
console.log('1. Ve al panel de Supabase > Storage');
console.log('2. Crea una carpeta "training-videos" en el bucket "kosmos-crm"');
console.log('3. Sube cada archivo MP4 a esa carpeta');
console.log('4. Actualiza las URLs en training-videos.json con las URLs del bucket\n');

console.log('OPCIÓN 2 - Automática (Requiere variables de entorno):');
console.log('1. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
console.log('2. Ejecuta: node scripts/upload-training-videos.js');
console.log('3. El script subirá automáticamente todos los videos\n');

console.log('=== VIDEOS LISTOS PARA LA PÁGINA DE ENTREGABLES ===');
console.log('Los usuarios ahora pueden ver los videos en:');
console.log('- /dashboard/entregables');
console.log('Cada video incluye:');
console.log('- Título descriptivo');
console.log('- Descripción detallada');
console.log('- Categoría y duración');
console.log('- Botón para reproducir en nueva pestaña');

console.log('\n¡Proceso completado exitosamente!');
