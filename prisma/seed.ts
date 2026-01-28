import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const managerPassword = await bcrypt.hash('manager123', 10)
  const userPassword = await bcrypt.hash('user123', 10)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@kosmoscrm.com' },
    update: {},
    create: {
      email: 'admin@kosmoscrm.com',
      password: hashedPassword,
      name: 'Carlos Méndez',
      avatar: null,
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@kosmoscrm.com' },
    update: {},
    create: {
      email: 'manager@kosmoscrm.com',
      password: managerPassword,
      name: 'Ana García',
      avatar: null,
    },
  })

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@kosmoscrm.com' },
    update: {},
    create: {
      email: 'user@kosmoscrm.com',
      password: userPassword,
      name: 'Juan Pérez',
      avatar: null,
    },
  })

  console.log('✅ Usuarios creados:', superAdmin.email, manager.email, regularUser.email)

  const company1 = await prisma.company.upsert({
    where: { id: 'company-tech-solutions' },
    update: {},
    create: {
      id: 'company-tech-solutions',
      name: 'Tech Solutions S.A.',
      logo: null,
      industry: 'Tecnología',
      isActive: true,
    },
  })

  const company2 = await prisma.company.upsert({
    where: { id: 'company-marketing-pro' },
    update: {},
    create: {
      id: 'company-marketing-pro',
      name: 'Marketing Pro Ltd.',
      logo: null,
      industry: 'Marketing Digital',
      isActive: true,
    },
  })

  console.log('✅ Empresas creadas:', company1.name, company2.name)

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: superAdmin.id,
        companyId: company1.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      companyId: company1.id,
      role: 'SUPER_ADMIN',
    },
  })

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: superAdmin.id,
        companyId: company2.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      companyId: company2.id,
      role: 'ADMIN',
    },
  })

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: manager.id,
        companyId: company1.id,
      },
    },
    update: {},
    create: {
      userId: manager.id,
      companyId: company1.id,
      role: 'MANAGER',
    },
  })

  await prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId: regularUser.id,
        companyId: company1.id,
      },
    },
    update: {},
    create: {
      userId: regularUser.id,
      companyId: company1.id,
      role: 'USER',
    },
  })

  console.log('✅ Relaciones usuario-empresa creadas (3 usuarios con roles diferentes)')

  const incomes = [
    { client: 'Cliente A', concept: 'Desarrollo Web', amount: 15000, margin: 35, method: 'Transferencia', status: 'PAID' as const },
    { client: 'Cliente B', concept: 'Consultoría IT', amount: 8500, margin: 40, method: 'Cheque', status: 'PAID' as const },
    { client: 'Cliente C', concept: 'Soporte Técnico', amount: 3200, margin: 50, method: 'Efectivo', status: 'PENDING' as const },
    { client: 'Cliente D', concept: 'Licencias Software', amount: 12000, margin: 30, method: 'Transferencia', status: 'PAID' as const },
    { client: 'Cliente E', concept: 'Hosting Anual', amount: 2400, margin: 60, method: 'Tarjeta', status: 'PENDING' as const },
    { client: 'Cliente F', concept: 'Mantenimiento', amount: 5500, margin: 45, method: 'Transferencia', status: 'PAID' as const },
    { client: 'Cliente G', concept: 'Capacitación', amount: 4800, margin: 55, method: 'Cheque', status: 'PAID' as const },
    { client: 'Cliente H', concept: 'Desarrollo App', amount: 22000, margin: 38, method: 'Transferencia', status: 'PENDING' as const },
    { client: 'Cliente I', concept: 'Diseño UX/UI', amount: 6700, margin: 42, method: 'Transferencia', status: 'PAID' as const },
    { client: 'Cliente J', concept: 'SEO Mensual', amount: 1800, margin: 65, method: 'Tarjeta', status: 'PAID' as const },
  ]

  for (const income of incomes) {
    await prisma.income.create({
      data: {
        companyId: company1.id,
        refNumber: `ING-${Math.floor(Math.random() * 10000)}`,
        client: income.client,
        concept: income.concept,
        amount: income.amount,
        margin: income.margin,
        method: income.method,
        status: income.status,
        date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      },
    })
  }

  console.log('✅ 10 ingresos creados')

  const expenses = [
    { provider: 'AWS', concept: 'Hosting Cloud', amount: 850, category: 'Infraestructura', method: 'Tarjeta', status: 'PAID' as const },
    { provider: 'Office Depot', concept: 'Material Oficina', amount: 320, category: 'Suministros', method: 'Efectivo', status: 'PAID' as const },
    { provider: 'Telefónica', concept: 'Internet Empresarial', amount: 180, category: 'Servicios', method: 'Transferencia', status: 'PENDING' as const },
    { provider: 'Adobe', concept: 'Licencias Creative Cloud', amount: 450, category: 'Software', method: 'Tarjeta', status: 'PAID' as const },
    { provider: 'Uber Eats', concept: 'Almuerzos Equipo', amount: 275, category: 'Alimentación', method: 'Tarjeta', status: 'PAID' as const },
    { provider: 'Microsoft', concept: 'Office 365', amount: 380, category: 'Software', method: 'Transferencia', status: 'PAID' as const },
    { provider: 'Freelancer', concept: 'Diseño Gráfico', amount: 1200, category: 'Servicios', method: 'Transferencia', status: 'PENDING' as const },
    { provider: 'Google Ads', concept: 'Publicidad Digital', amount: 950, category: 'Marketing', method: 'Tarjeta', status: 'PAID' as const },
    { provider: 'Zoom', concept: 'Plan Empresarial', amount: 150, category: 'Software', method: 'Tarjeta', status: 'PAID' as const },
    { provider: 'Courier', concept: 'Envíos Documentos', amount: 85, category: 'Logística', method: 'Efectivo', status: 'PENDING' as const },
  ]

  for (const expense of expenses) {
    await prisma.expense.create({
      data: {
        companyId: company1.id,
        refNumber: `EXP-${Math.floor(Math.random() * 10000)}`,
        provider: expense.provider,
        concept: expense.concept,
        amount: expense.amount,
        category: expense.category,
        method: expense.method,
        status: expense.status,
        date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      },
    })
  }

  console.log('✅ 10 gastos creados')

  const activities = [
    { type: 'CALL' as const, title: 'Llamada seguimiento Cliente A', client: 'Cliente A', status: 'COMPLETED' as const, priority: 'Alta' },
    { type: 'MEETING' as const, title: 'Reunión presentación proyecto', client: 'Cliente B', status: 'PENDING' as const, priority: 'Alta' },
    { type: 'QUOTE' as const, title: 'Cotización desarrollo web', client: 'Cliente C', status: 'IN_PROGRESS' as const, priority: 'Media' },
    { type: 'CALL' as const, title: 'Llamada soporte técnico', client: 'Cliente D', status: 'COMPLETED' as const, priority: 'Baja' },
    { type: 'MEETING' as const, title: 'Reunión cierre contrato', client: 'Cliente E', status: 'PENDING' as const, priority: 'Alta' },
    { type: 'OTHER' as const, title: 'Envío propuesta comercial', client: 'Cliente F', status: 'COMPLETED' as const, priority: 'Media' },
    { type: 'CALL' as const, title: 'Llamada renovación servicio', client: 'Cliente G', status: 'PENDING' as const, priority: 'Media' },
    { type: 'QUOTE' as const, title: 'Cotización mantenimiento', client: 'Cliente H', status: 'IN_PROGRESS' as const, priority: 'Baja' },
    { type: 'MEETING' as const, title: 'Reunión kickoff proyecto', client: 'Cliente I', status: 'PENDING' as const, priority: 'Alta' },
    { type: 'CALL' as const, title: 'Llamada resolución incidencia', client: 'Cliente J', status: 'COMPLETED' as const, priority: 'Alta' },
  ]

  for (const activity of activities) {
    await prisma.activity.create({
      data: {
        companyId: company1.id,
        type: activity.type,
        title: activity.title,
        description: `Descripción de ${activity.title}`,
        client: activity.client,
        status: activity.status,
        priority: activity.priority,
        assignedTo: 'admin@kosmoscrm.com',
        dueDate: new Date(2024, 11, Math.floor(Math.random() * 28) + 1),
        completedAt: activity.status === 'COMPLETED' ? new Date() : null,
      },
    })
  }

  console.log('✅ 10 actividades creadas')

  const opportunities = [
    { title: 'Desarrollo ERP Personalizado', client: 'Empresa X', value: 45000, stage: 'PROSPECTO' as const },
    { title: 'Migración Cloud AWS', client: 'Empresa Y', value: 28000, stage: 'PROPUESTA' as const },
    { title: 'App Móvil iOS/Android', client: 'Empresa Z', value: 35000, stage: 'NEGOCIACION' as const },
    { title: 'Consultoría Transformación Digital', client: 'Empresa W', value: 52000, stage: 'CALIFICADO' as const },
    { title: 'Sistema CRM Customizado', client: 'Empresa V', value: 38000, stage: 'PROPUESTA' as const },
    { title: 'Plataforma E-commerce', client: 'Empresa U', value: 42000, stage: 'PROSPECTO' as const },
    { title: 'Integración API Pagos', client: 'Empresa T', value: 15000, stage: 'NEGOCIACION' as const },
    { title: 'Dashboard Analytics BI', client: 'Empresa S', value: 22000, stage: 'PROPUESTA' as const },
    { title: 'Automatización Procesos RPA', client: 'Empresa R', value: 31000, stage: 'CALIFICADO' as const },
    { title: 'Auditoría Seguridad IT', client: 'Empresa Q', value: 18000, stage: 'PROSPECTO' as const },
  ]

  for (const opp of opportunities) {
    await prisma.opportunity.create({
      data: {
        companyId: company1.id,
        title: opp.title,
        client: opp.client,
        value: opp.value,
        stage: opp.stage,
        status: 'Activo',
        assignedTo: 'admin@kosmoscrm.com',
        closeDate: new Date(2025, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1),
      },
    })
  }

  console.log('✅ 10 oportunidades creadas')

  const documents = [
    { name: 'Contrato Cliente A.pdf', type: 'PDF' as const, concept: 'Contrato Servicios', size: 245000 },
    { name: 'Propuesta Comercial B.docx', type: 'DOC' as const, concept: 'Propuesta', size: 128000 },
    { name: 'Reporte Financiero Q4.xlsx', type: 'XLSX' as const, concept: 'Finanzas', size: 512000 },
    { name: 'Logo Empresa.png', type: 'PNG' as const, concept: 'Branding', size: 89000 },
    { name: 'Manual Usuario.pdf', type: 'PDF' as const, concept: 'Documentación', size: 1024000 },
  ]

  for (const doc of documents) {
    await prisma.document.create({
      data: {
        companyId: company1.id,
        name: doc.name,
        type: doc.type,
        concept: doc.concept,
        category: 'General',
        fileUrl: `/uploads/documents/${doc.name}`,
        fileSize: doc.size,
        uploadedBy: 'admin@kosmoscrm.com',
      },
    })
  }

  console.log('✅ 5 documentos creados')

  const contracts = [
    { contractId: 'CTR-2024-001', name: 'Contrato Hosting AWS', party: 'Amazon Web Services', startDate: new Date(2024, 0, 1), endDate: new Date(2024, 11, 31), status: 'ACTIVE' as const },
    { contractId: 'CTR-2024-002', name: 'Licencia Microsoft 365', party: 'Microsoft Corporation', startDate: new Date(2024, 2, 1), endDate: new Date(2025, 1, 28), status: 'EXPIRING_SOON' as const },
    { contractId: 'CTR-2023-015', name: 'Servicio Mantenimiento', party: 'Tech Support Inc', startDate: new Date(2023, 6, 1), endDate: new Date(2024, 5, 30), status: 'EXPIRED' as const },
    { contractId: 'CTR-2024-003', name: 'Arrendamiento Oficina', party: 'Inmobiliaria XYZ', startDate: new Date(2024, 0, 1), endDate: new Date(2025, 11, 31), status: 'ACTIVE' as const },
    { contractId: 'CTR-2024-004', name: 'Seguro Empresarial', party: 'Seguros ABC', startDate: new Date(2024, 3, 1), endDate: new Date(2025, 2, 31), status: 'ACTIVE' as const },
  ]

  for (const contract of contracts) {
    await prisma.contract.create({
      data: {
        companyId: company1.id,
        contractId: contract.contractId,
        name: contract.name,
        concept: 'Servicios',
        category: 'Operativo',
        party: contract.party,
        startDate: contract.startDate,
        endDate: contract.endDate,
        status: contract.status,
        fileUrl: `/uploads/contracts/${contract.contractId}.pdf`,
        uploadedBy: 'admin@kosmoscrm.com',
      },
    })
  }

  console.log('✅ 5 contratos creados')

  const clients = [
    { name: 'Acme Corporation', contactName: 'Roberto Martínez', email: 'roberto@acme.com', phone: '+505 8888-1111', status: 'ACTIVO' as const },
    { name: 'Global Tech SA', contactName: 'María López', email: 'maria@globaltech.com', phone: '+505 8888-2222', status: 'PROSPECTO' as const },
    { name: 'Innovate Solutions', contactName: 'Pedro Sánchez', email: 'pedro@innovate.com', phone: '+505 8888-3333', status: 'PROPUESTA' as const },
    { name: 'Digital Marketing Pro', contactName: 'Laura Fernández', email: 'laura@dmpro.com', phone: '+505 8888-4444', status: 'NEGOCIACION' as const },
    { name: 'Enterprise Systems', contactName: 'José Ramírez', email: 'jose@enterprise.com', phone: '+505 8888-5555', status: 'CALIFICADO' as const },
    { name: 'Cloud Services Inc', contactName: 'Carmen Díaz', email: 'carmen@cloudservices.com', phone: '+505 8888-6666', status: 'ACTIVO' as const },
    { name: 'Tech Startup', contactName: 'Miguel Torres', email: 'miguel@techstartup.com', phone: '+505 8888-7777', status: 'PROSPECTO' as const },
  ]

  for (const client of clients) {
    await prisma.client.create({
      data: {
        companyId: company1.id,
        name: client.name,
        contactName: client.contactName,
        email: client.email,
        phone: client.phone,
        status: client.status,
      },
    })
  }

  console.log('✅ 7 clientes creados')

  const categories = [
    { name: 'Hardware', description: 'Equipos y componentes físicos' },
    { name: 'Software', description: 'Licencias y aplicaciones' },
    { name: 'Servicios', description: 'Servicios profesionales' },
    { name: 'Consumibles', description: 'Material de oficina y consumibles' },
  ]

  for (const cat of categories) {
    await prisma.productCategory.create({
      data: {
        companyId: company1.id,
        name: cat.name,
        description: cat.description,
      },
    })
  }

  console.log('✅ 4 categorías de productos creadas')

  const hardwareCat = await prisma.productCategory.findFirst({ where: { name: 'Hardware' } })
  const softwareCat = await prisma.productCategory.findFirst({ where: { name: 'Software' } })
  const servicesCat = await prisma.productCategory.findFirst({ where: { name: 'Servicios' } })

  const products = [
    { sku: 'HW-001', name: 'Laptop Dell XPS 15', categoryId: hardwareCat!.id, stock: 15, cost: 1200, price: 1800, description: 'Laptop profesional' },
    { sku: 'HW-002', name: 'Monitor LG 27"', categoryId: hardwareCat!.id, stock: 8, cost: 250, price: 400, description: 'Monitor 4K' },
    { sku: 'SW-001', name: 'Licencia Office 365', categoryId: softwareCat!.id, stock: 50, cost: 80, price: 150, description: 'Licencia anual' },
    { sku: 'SW-002', name: 'Antivirus Kaspersky', categoryId: softwareCat!.id, stock: 30, cost: 40, price: 80, description: 'Protección empresarial' },
    { sku: 'SV-001', name: 'Consultoría IT', categoryId: servicesCat!.id, stock: 100, cost: 50, price: 120, description: 'Hora de consultoría' },
    { sku: 'SV-002', name: 'Soporte Técnico', categoryId: servicesCat!.id, stock: 100, cost: 30, price: 75, description: 'Hora de soporte' },
    { sku: 'HW-003', name: 'Teclado Mecánico', categoryId: hardwareCat!.id, stock: 25, cost: 60, price: 120, description: 'Teclado gaming' },
    { sku: 'HW-004', name: 'Mouse Inalámbrico', categoryId: hardwareCat!.id, stock: 40, cost: 15, price: 35, description: 'Mouse ergonómico' },
  ]

  for (const product of products) {
    await prisma.product.create({
      data: {
        companyId: company1.id,
        categoryId: product.categoryId,
        sku: product.sku,
        name: product.name,
        description: product.description,
        stock: product.stock,
        cost: product.cost,
        price: product.price,
      },
    })
  }

  console.log('✅ 8 productos creados')

  const clientsForQuotes = await prisma.client.findMany({ where: { companyId: company1.id }, take: 3 })
  const productsForQuotes = await prisma.product.findMany({ where: { companyId: company1.id }, take: 4 })

  const quote1 = await prisma.quote.create({
    data: {
      companyId: company1.id,
      clientId: clientsForQuotes[0].id,
      quoteNumber: 'COT-2024-001',
      currency: 'USD',
      subtotal: 3600,
      discount: 180,
      tax: 513,
      total: 3933,
      status: 'DRAFT',
      validUntil: new Date(2024, 11, 31),
      notes: 'Cotización para equipos de oficina',
      createdBy: superAdmin.id,
      items: {
        create: [
          { productId: productsForQuotes[0].id, description: productsForQuotes[0].name, quantity: 2, unitPrice: 1800, discount: 5, tax: 15, total: 3591 },
        ],
      },
    },
  })

  const quote2 = await prisma.quote.create({
    data: {
      companyId: company1.id,
      clientId: clientsForQuotes[1].id,
      quoteNumber: 'COT-2024-002',
      currency: 'USD',
      subtotal: 1200,
      discount: 60,
      tax: 171,
      total: 1311,
      status: 'SENT',
      validUntil: new Date(2025, 0, 15),
      notes: 'Cotización servicios de consultoría',
      createdBy: superAdmin.id,
      items: {
        create: [
          { productId: productsForQuotes[1].id, description: productsForQuotes[1].name, quantity: 10, unitPrice: 120, discount: 5, tax: 15, total: 1311 },
        ],
      },
    },
  })

  console.log('✅ 2 cotizaciones creadas')

  const clientsForTickets = await prisma.client.findMany({ where: { companyId: company1.id } })

  const tickets = [
    { title: 'Error en módulo de facturación', clientId: clientsForTickets[0]?.id, description: 'El sistema no genera facturas correctamente', priority: 'HIGH' as const, status: 'PROCESO1' as const, amount: 500 },
    { title: 'Solicitud nueva funcionalidad', clientId: clientsForTickets[1]?.id, description: 'Requieren integración con API de pagos', priority: 'MEDIUM' as const, status: 'PROCESO2' as const, amount: 2500 },
    { title: 'Consulta sobre licencias', clientId: clientsForTickets[2]?.id, description: 'Dudas sobre renovación de licencias', priority: 'LOW' as const, status: 'PROCESO3' as const, amount: 150 },
    { title: 'Problema de rendimiento', clientId: clientsForTickets[3]?.id, description: 'La aplicación está lenta en horas pico', priority: 'URGENT' as const, status: 'PROCESO1' as const, amount: 800 },
    { title: 'Capacitación usuarios', clientId: clientsForTickets[4]?.id, description: 'Solicitan capacitación para nuevo personal', priority: 'MEDIUM' as const, status: 'PROCESO4' as const, amount: 1200 },
    { title: 'Migración de datos', clientId: clientsForTickets[5]?.id, description: 'Necesitan migrar datos del sistema antiguo', priority: 'HIGH' as const, status: 'PROCESO2' as const, amount: 3500 },
  ]

  for (const ticket of tickets) {
    if (ticket.clientId) {
      await prisma.ticket.create({
        data: {
          companyId: company1.id,
          clientId: ticket.clientId,
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          status: ticket.status,
          amount: ticket.amount,
          createdBy: superAdmin.id,
        },
      })
    }
  }

  console.log('✅ 6 tickets creados')

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log('   - 3 usuarios (SUPER_ADMIN, MANAGER, USER)')
  console.log('   - 2 empresas')
  console.log('   - 10 ingresos')
  console.log('   - 10 gastos')
  console.log('   - 10 actividades')
  console.log('   - 10 oportunidades')
  console.log('   - 5 documentos')
  console.log('   - 5 contratos')
  console.log('   - 7 clientes')
  console.log('   - 4 categorías de productos')
  console.log('   - 8 productos')
  console.log('   - 2 cotizaciones')
  console.log('   - 6 tickets')
  console.log('\n🔐 Credenciales de acceso:')
  console.log('\n   👑 SUPER ADMIN (acceso total):')
  console.log('      Email: admin@kosmoscrm.com')
  console.log('      Password: admin123')
  console.log('\n   👔 MANAGER (gestión y reportes):')
  console.log('      Email: manager@kosmoscrm.com')
  console.log('      Password: manager123')
  console.log('\n   👤 USER (operaciones básicas):')
  console.log('      Email: user@kosmoscrm.com')
  console.log('      Password: user123')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
