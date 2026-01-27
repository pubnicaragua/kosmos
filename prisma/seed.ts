import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  const hashedPassword = await bcrypt.hash('admin123', 10)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@kosmoscrm.com' },
    update: {},
    create: {
      email: 'admin@kosmoscrm.com',
      password: hashedPassword,
      name: 'Super Admin',
      avatar: null,
    },
  })

  console.log('✅ Usuario SUPER_ADMIN creado:', superAdmin.email)

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

  console.log('✅ Relaciones usuario-empresa creadas')

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

  console.log('\n🎉 Seed completado exitosamente!')
  console.log('\n📊 Resumen:')
  console.log('   - 1 usuario SUPER_ADMIN (admin@kosmoscrm.com / admin123)')
  console.log('   - 2 empresas')
  console.log('   - 10 ingresos')
  console.log('   - 10 gastos')
  console.log('   - 10 actividades')
  console.log('   - 10 oportunidades')
  console.log('   - 5 documentos')
  console.log('   - 5 contratos')
  console.log('\n🔐 Credenciales de acceso:')
  console.log('   Email: admin@kosmoscrm.com')
  console.log('   Password: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
