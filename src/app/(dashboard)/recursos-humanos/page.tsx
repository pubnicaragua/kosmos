'use client'

import { useState, useEffect } from 'react'
import { useModulePermissions } from '@/hooks/useModulePermissions'
import { Download, Upload, FileText, Plus, User, Edit2, Trash2, X, Camera, Users, Briefcase, Calendar, DollarSign, Building2, Phone, Mail, MapPin, Heart, GraduationCap, Shield, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, Button, Input, Badge, Modal } from '@/components/ui-kit'
import * as XLSX from 'xlsx'

interface Employee {
  id: string
  employeeCode: string
  fullName: string
  email: string | null
  phone: string | null
  position: string
  department: string
  startDate: string
  salary: number
  contractType: string
  bankName: string | null
  accountNumber: string | null
  address: string | null
  birthDate: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  socialSecurityNumber: string | null
  bloodType: string | null
  educationLevel: string | null
  benefits: string | null
  status: string
  photo: string | null
  notes: string | null
  createdAt: string
}

interface Payroll {
  id: string
  name: string | null
  period: string
  fileName: string
  fileUrl: string
  totalAmount: number
  status: string
  notes: string | null
  createdAt: string
  expense: {
    id: string
    refNumber: string
    status: string
  } | null
}

export default function RecursosHumanosPage() {
  const permissions = useModulePermissions('empleados', { requireAction: 'view' })
  const [activeTab, setActiveTab] = useState<'employees' | 'payrolls'>('employees')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [activeCompany, setActiveCompany] = useState<any>(null)
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPayrolls, setSelectedPayrolls] = useState<Set<string>>(new Set())
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [showEmployeeImportModal, setShowEmployeeImportModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [importingEmployees, setImportingEmployees] = useState(false)
  const [employeeImportFile, setEmployeeImportFile] = useState<File | null>(null)
  const [createExpenseFromImport, setCreateExpenseFromImport] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showBankSection, setShowBankSection] = useState(false)
  const [showPersonalSection, setShowPersonalSection] = useState(false)
  const [showExtraSection, setShowExtraSection] = useState(false)
  const [showBenefitsSection, setShowBenefitsSection] = useState(false)
  const [employeeForm, setEmployeeForm] = useState({
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    startDate: '',
    salary: '',
    contractType: 'Indefinido',
    bankName: '',
    accountNumber: '',
    address: '',
    birthDate: '',
    emergencyContact: '',
    emergencyPhone: '',
    socialSecurityNumber: '',
    bloodType: '',
    educationLevel: '',
    benefits: '',
    status: 'ACTIVO',
    photo: '',
    notes: ''
  })
  const [payrollForm, setPayrollForm] = useState({
    name: '',
    period: '',
    totalAmount: '',
    notes: '',
    createExpense: true,
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  useEffect(() => {
    const company = localStorage.getItem('activeCompany')
    if (company) {
      setActiveCompany(JSON.parse(company))
    }
  }, [])

  useEffect(() => {
    if (activeCompany?.id) {
      if (activeTab === 'employees') {
        fetchEmployees()
      } else {
        fetchPayrolls()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompany, activeTab])

  const fetchPayrolls = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !activeCompany?.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/payrolls?companyId=${activeCompany.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setPayrolls(data.data)
      }
    } catch (err) {
      console.error('Error fetching payrolls:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !activeCompany?.id) return

    setLoading(true)
    try {
      const res = await fetch(`/api/employees?companyId=${activeCompany.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setEmployees(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEmployeeModal = (employee?: Employee) => {
    if (employee) {
      setSelectedEmployee(employee)
      setIsEditing(true)
      setEmployeeForm({
        employeeCode: employee.employeeCode,
        fullName: employee.fullName,
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position,
        department: employee.department,
        startDate: employee.startDate.split('T')[0],
        salary: employee.salary.toString(),
        contractType: employee.contractType,
        bankName: employee.bankName || '',
        accountNumber: employee.accountNumber || '',
        address: employee.address || '',
        birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : '',
        emergencyContact: employee.emergencyContact || '',
        emergencyPhone: employee.emergencyPhone || '',
        socialSecurityNumber: employee.socialSecurityNumber || '',
        bloodType: employee.bloodType || '',
        educationLevel: employee.educationLevel || '',
        benefits: employee.benefits || '',
        status: employee.status,
        photo: employee.photo || '',
        notes: employee.notes || ''
      })
    } else {
      setSelectedEmployee(null)
      setIsEditing(false)
      setEmployeeForm({
        employeeCode: '',
        fullName: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        startDate: '',
        salary: '',
        contractType: 'Indefinido',
        bankName: '',
        accountNumber: '',
        address: '',
        birthDate: '',
        emergencyContact: '',
        emergencyPhone: '',
        socialSecurityNumber: '',
        bloodType: '',
        educationLevel: '',
        benefits: '',
        status: 'ACTIVO',
        photo: '',
        notes: ''
      })
    }
    setShowEmployeeModal(true)
  }

  const handleSaveEmployee = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !activeCompany?.id) return

    setUploading(true)
    try {
      const url = isEditing ? `/api/employees/${selectedEmployee?.id}` : '/api/employees'
      const method = isEditing ? 'PUT' : 'POST'

      const payload: any = {
        ...employeeForm,
        companyId: activeCompany.id,
        salary: parseFloat(employeeForm.salary) || 0,
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        await fetchEmployees()
        setShowEmployeeModal(false)
      } else {
        alert(data.error || 'Error al guardar empleado')
      }
    } catch (err) {
      console.error('Error saving employee:', err)
      alert('Error al guardar empleado')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('¿Eliminar este empleado?')) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        await fetchEmployees()
      }
    } catch (err) {
      console.error('Error deleting employee:', err)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (data.success && data.data?.url) {
        setEmployeeForm(prev => ({ ...prev, photo: data.data.url }))
      }
    } catch (err) {
      console.error('Error uploading photo:', err)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const generateMockEmployee = async () => {
    if (!activeCompany?.id) {
      alert('Selecciona una empresa primero')
      return
    }

    setIsGenerating(true)
    try {
      const mockNames = [
        'Juan Pérez García', 'María López Hernández', 'Carlos Martínez Ruiz',
        'Ana Rodríguez Castro', 'Roberto Sánchez Morales', 'Laura Fernández Gómez',
        'Diego Ramírez Torres', 'Patricia Morales Vega', 'Fernando Castro Díaz',
        'Gabriela Ortiz Méndez'
      ]
      const mockPositions = ['Gerente', 'Contador', 'Técnico', 'Asistente', 'Vendedor', 'Diseñador', 'Desarrollador', 'Analista']
      const mockDepartments = ['Ventas', 'Contabilidad', 'IT', 'Administración', 'Marketing', 'RRHH', 'Producción']
      
      const randomName = mockNames[Math.floor(Math.random() * mockNames.length)]
      const randomPosition = mockPositions[Math.floor(Math.random() * mockPositions.length)]
      const randomDepartment = mockDepartments[Math.floor(Math.random() * mockDepartments.length)]
      const randomSalary = Math.floor(Math.random() * 15000) + 15000
      const randomCode = `EMP${String(employees.length + 1).padStart(3, '0')}`

      const mockEmployee = {
        companyId: activeCompany.id,
        employeeCode: randomCode,
        fullName: randomName,
        email: `${randomName.split(' ')[0].toLowerCase()}@empresa.com`,
        phone: `8${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`,
        position: randomPosition,
        department: randomDepartment,
        startDate: new Date().toISOString().split('T')[0],
        salary: randomSalary,
        contractType: 'Indefinido',
        bankName: Math.random() > 0.5 ? 'BAC' : 'Banpro',
        accountNumber: String(Math.floor(Math.random() * 9000000000 + 1000000000)),
        status: 'ACTIVO'
      }

      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockEmployee)
      })

      const data = await res.json()
      if (data.success) {
        fetchEmployees()
        alert(`Empleado ${randomName} generado exitosamente`)
      } else {
        alert(data.error || 'Error al generar empleado')
      }
    } catch (err) {
      console.error('Error generating employee:', err)
      alert('Error al generar empleado')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadEmployeeTemplate = async () => {
    const XLSX = await import('xlsx')
    const template = [
      { Codigo: 'EMP001', Nombre: 'Juan Pérez García', Email: 'juan.perez@empresa.com', Telefono: '8888-1234', Puesto: 'Gerente de Ventas', Departamento: 'Ventas', FechaIngreso: '2024-01-15', Salario: 25000, TipoContrato: 'Indefinido', Banco: 'BAC', NumeroCuenta: '1234567890' },
      { Codigo: 'EMP002', Nombre: 'María López Hernández', Email: 'maria.lopez@empresa.com', Telefono: '8777-5678', Puesto: 'Contador', Departamento: 'Contabilidad', FechaIngreso: '2024-02-01', Salario: 22000, TipoContrato: 'Indefinido', Banco: 'Banpro', NumeroCuenta: '0987654321' },
      { Codigo: 'EMP003', Nombre: 'Carlos Martínez Ruiz', Email: 'carlos.martinez@empresa.com', Telefono: '8666-9012', Puesto: 'Técnico de Soporte', Departamento: 'IT', FechaIngreso: '2024-03-10', Salario: 18000, TipoContrato: 'Temporal', Banco: 'BAC', NumeroCuenta: '1122334455' },
      { Codigo: 'EMP004', Nombre: 'Ana Rodríguez Castro', Email: 'ana.rodriguez@empresa.com', Telefono: '8555-3456', Puesto: 'Asistente Administrativa', Departamento: 'Administración', FechaIngreso: '2024-04-05', Salario: 15000, TipoContrato: 'Indefinido', Banco: 'Banpro', NumeroCuenta: '5566778899' },
      { Codigo: 'EMP005', Nombre: 'Roberto Sánchez Morales', Email: 'roberto.sanchez@empresa.com', Telefono: '8444-7890', Puesto: 'Vendedor', Departamento: 'Ventas', FechaIngreso: '2024-05-20', Salario: 16000, TipoContrato: 'Por Proyecto', Banco: 'BAC', NumeroCuenta: '9988776655' },
      { Codigo: 'EMP006', Nombre: 'Laura Fernández Gómez', Email: 'laura.fernandez@empresa.com', Telefono: '8333-2345', Puesto: 'Diseñadora Gráfica', Departamento: 'Marketing', FechaIngreso: '2024-06-15', Salario: 19000, TipoContrato: 'Indefinido', Banco: 'Banpro', NumeroCuenta: '4433221100' },
      { Codigo: 'EMP007', Nombre: 'Diego Ramírez Torres', Email: 'diego.ramirez@empresa.com', Telefono: '8222-6789', Puesto: 'Desarrollador', Departamento: 'IT', FechaIngreso: '2024-07-01', Salario: 28000, TipoContrato: 'Indefinido', Banco: 'BAC', NumeroCuenta: '7788990011' },
      { Codigo: 'EMP008', Nombre: 'Patricia Morales Vega', Email: 'patricia.morales@empresa.com', Telefono: '8111-0123', Puesto: 'Recursos Humanos', Departamento: 'RRHH', FechaIngreso: '2024-08-10', Salario: 21000, TipoContrato: 'Indefinido', Banco: 'Banpro', NumeroCuenta: '2233445566' },
      { Codigo: 'EMP009', Nombre: 'Fernando Castro Díaz', Email: 'fernando.castro@empresa.com', Telefono: '8000-4567', Puesto: 'Supervisor de Producción', Departamento: 'Producción', FechaIngreso: '2024-09-05', Salario: 23000, TipoContrato: 'Indefinido', Banco: 'BAC', NumeroCuenta: '6677889900' },
      { Codigo: 'EMP010', Nombre: 'Gabriela Ortiz Méndez', Email: 'gabriela.ortiz@empresa.com', Telefono: '7999-8901', Puesto: 'Analista de Datos', Departamento: 'IT', FechaIngreso: '2024-10-01', Salario: 26000, TipoContrato: 'Indefinido', Banco: 'Banpro', NumeroCuenta: '1122334455' }
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(template)
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados')
    XLSX.writeFile(wb, 'plantilla_empleados_kosmos.xlsx')
  }

  const handleImportEmployees = async () => {
    if (!employeeImportFile || !activeCompany?.id) {
      alert('Por favor selecciona un archivo')
      return
    }

    setImportingEmployees(true)
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await employeeImportFile.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const employees = XLSX.utils.sheet_to_json(firstSheet)

      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: activeCompany.id,
          employees,
          createExpense: createExpenseFromImport,
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert(data.data.message || 'Empleados importados exitosamente')
        setShowEmployeeImportModal(false)
        setEmployeeImportFile(null)
        await fetchEmployees()
      } else {
        alert(data.error || 'Error al importar empleados')
      }
    } catch (err) {
      console.error('Error importing employees:', err)
      alert('Error al importar empleados')
    } finally {
      setImportingEmployees(false)
    }
  }

  const handleSeedTestData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !activeCompany?.id) return

    const samplePeriods = [
      { period: 'Enero 2026', amount: 185000, notes: 'Planilla regular. 24 empleados activos.' },
      { period: 'Diciembre 2025', amount: 192500, notes: 'Incluye aguinaldo y bonificaciones navideñas.' },
      { period: 'Noviembre 2025', amount: 183000, notes: 'Planilla regular. 24 empleados activos.' },
      { period: 'Octubre 2025', amount: 181500, notes: 'Planilla regular con descuentos INSS.' },
      { period: 'Septiembre 2025', amount: 179000, notes: 'Planilla regular. 23 empleados activos.' },
    ]

    setLoading(true)
    try {
      for (const sample of samplePeriods) {
        await fetch('/api/payrolls', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: activeCompany.id,
            period: sample.period,
            fileName: `planilla_${sample.period.replace(' ', '_').toLowerCase()}.xlsx`,
            fileUrl: '#',
            totalAmount: sample.amount,
            notes: sample.notes,
            createExpense: true,
          }),
        })
      }
      await fetchPayrolls()
    } catch (err) {
      console.error('Error seeding test data:', err)
    } finally {
      setLoading(false)
    }
  }

const handleDownloadTemplate = () => {
    setShowTemplateModal(true)
  }

  const handleConfirmDownloadTemplate = () => {
    // Enhanced template with professional fields
    const headers = [
      { 
        Nombre: 'Juan Perez', 
        Cedula: '001-123456-0000A', 
        Cargo: 'Técnico de CCTV', 
        Departamento: 'Operaciones', 
        Salario: 15000.00, 
        FechaIngreso: '2025-01-15', 
        TipoContrato: 'Indefinido', 
        Estado: 'Activo', 
        Sucursal: 'Central', 
        Notas: 'Excelente rendimiento' 
      },
    ]
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(headers)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla Nomina')
    XLSX.writeFile(workbook, 'plantilla_nomina_kosmos.xlsx')
    setShowTemplateModal(false)
  }

  const handleImportXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data: any[] = XLSX.utils.sheet_to_json(ws)

      if (data.length === 0) {
        alert('El archivo esta vacio')
        return
      }

      if (confirm(`¿Desea importar ${data.length} registros de nomina?`)) {
        setLoading(true)
        const token = localStorage.getItem('accessToken')
        try {
          for (const row of data) {
            await fetch('/api/payrolls', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                companyId: activeCompany.id,
                name: row.Nombre || 'Sin nombre',
                period: row.Periodo || 'Sin periodo',
                totalAmount: row.Monto || 0,
                notes: row.Notas || '',
                fileName: 'Importación Masiva',
                fileUrl: '#',
                createExpense: true,
              }),
            })
          }
          alert('Importación completada')
          fetchPayrolls()
        } catch (err) {
          console.error('Import error:', err)
          alert('Error durante la importación')
        } finally {
          setLoading(false)
        }
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleExport = () => {
    if (!payrolls.length) {
      alert('No hay planillas para exportar')
      return
    }

    const rows = payrolls.map((payroll) => ({
      Nombre: payroll.name || '',
      Periodo: payroll.period,
      'Monto Total': payroll.totalAmount,
      Estado: payroll.status,
      'Archivo': payroll.fileName,
      'Notas': payroll.notes || '',
      'Fecha Creación': new Date(payroll.createdAt).toLocaleDateString('es-ES'),
      'Ref Gasto': payroll.expense?.refNumber || '',
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planillas')
    XLSX.writeFile(workbook, `planillas_${activeCompany?.name || 'empresa'}_${Date.now()}.xlsx`)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !payrollForm.period || !payrollForm.totalAmount) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    setUploading(true)

    try {
      // 1. Subir archivo
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadFormData,
      })

      const uploadData = await uploadRes.json()
      if (!uploadData.success) {
        alert('Error al subir archivo')
        return
      }

      const payrollRes = await fetch('/api/payrolls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: activeCompany.id,
          name: payrollForm.name,
          period: payrollForm.period,
          fileName: selectedFile.name,
          fileUrl: uploadData.data.url,
          totalAmount: parseFloat(payrollForm.totalAmount),
          notes: payrollForm.notes || null,
        }),
      })

      const payrollData = await payrollRes.json()
      if (payrollData.success) {
        alert('Planilla cargada exitosamente')
        setShowPayrollModal(false)
        setPayrollForm({ name: '', period: '', totalAmount: '', notes: '', createExpense: true })
        setSelectedFile(null)
        fetchPayrolls()
      } else {
        alert(payrollData.error || 'Error al crear planilla')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Error al procesar planilla')
    } finally {
      setUploading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPayrolls.size === 0) {
      alert('Selecciona al menos una planilla para eliminar')
      return
    }

    if (!confirm(`¿Estás seguro de eliminar ${selectedPayrolls.size} planilla(s)?`)) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      for (const id of Array.from(selectedPayrolls)) {
        await fetch(`/api/payrolls/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      setSelectedPayrolls(new Set())
      fetchPayrolls()
      alert('Planillas eliminadas exitosamente')
    } catch (err) {
      console.error('Error deleting payrolls:', err)
      alert('Error al eliminar planillas')
    }
  }

  const togglePayrollSelection = (id: string) => {
    setSelectedPayrolls(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleAllPayrolls = () => {
    if (selectedPayrolls.size === payrolls.length) {
      setSelectedPayrolls(new Set())
    } else {
      setSelectedPayrolls(new Set(payrolls.map(p => p.id)))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta planilla?')) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      await fetch(`/api/payrolls/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchPayrolls()
    } catch (err) {
      console.error('Error deleting payroll:', err)
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      await fetch(`/api/payrolls/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchPayrolls()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-NI', {
      style: 'currency',
      currency: 'NIO',
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDIENTE: 'bg-yellow-100 text-yellow-700',
      PROCESADA: 'bg-blue-100 text-blue-700',
      PAGADA: 'bg-green-100 text-green-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const filteredEmployees = employees.filter(emp =>
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name: string) => {
    const parts = name.split(' ')
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2)
  }

  if (!activeCompany) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Selecciona una empresa para gestionar recursos humanos</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Recursos Humanos</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Gestión de Empleados y Nómina • {activeTab === 'employees' ? employees.length : payrolls.length} Registros
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'payrolls' && selectedPayrolls.size > 0 && permissions.canDelete && (
            <Button variant="outline" onClick={handleBulkDelete} className="border-red-200 hover:bg-red-50 text-red-700 font-bold">
              <Trash2 className="w-4 h-4 mr-2" />
              ELIMINAR ({selectedPayrolls.size})
            </Button>
          )}
          {activeTab === 'employees' && (
            <Button 
              variant="outline" 
              onClick={generateMockEmployee}
              disabled={isGenerating}
              className="border-green-200 hover:bg-green-50 text-green-700 font-bold"
            >
              <Users className="w-4 h-4 mr-2" />
              {isGenerating ? 'GENERANDO...' : 'GENERAR EMPLEADO'}
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadTemplate} className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold">
            <Download className="w-4 h-4 mr-2" />
            PLANTILLA
          </Button>
          {activeTab === 'employees' ? (
            <>
              {permissions.canCreate && (
                <>
                  <Button variant="outline" onClick={() => setShowEmployeeImportModal(true)} className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold">
                    <Upload className="w-4 h-4 mr-2" />
                    IMPORTAR
                  </Button>
                  <Button onClick={() => handleOpenEmployeeModal()} className="bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-200 font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    NUEVO EMPLEADO
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {permissions.canCreate && (
                <label htmlFor="payroll-import" className="cursor-pointer">
                  <Button variant="outline" className="border-slate-200 hover:bg-slate-50 text-slate-700 font-bold pointer-events-none">
                    <Upload className="w-4 h-4 mr-2" />
                    IMPORTAR
                  </Button>
                  <input 
                    id="payroll-import" 
                    type="file" 
                    className="hidden" 
                    onChange={handleImportXLSX} 
                    accept=".xlsx,.xls" 
                  />
                </label>
              )}
              {permissions.canCreate && (
                <Button onClick={() => setShowPayrollModal(true)} className="bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-200 font-bold">
                  <Upload className="w-4 h-4 mr-2" />
                  NUEVA PLANILLA
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'employees'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            EMPLEADOS ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('payrolls')}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === 'payrolls'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            PLANILLAS ({payrolls.length})
          </button>
        </div>

        {/* Buscador */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder={activeTab === 'employees' ? 'Buscar empleado...' : 'Buscar planilla...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <Card>
          <p className="text-center text-gray-500 py-8">Cargando...</p>
        </Card>
      ) : activeTab === 'employees' ? (
        filteredEmployees.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-4">No hay empleados registrados</p>
              <Button onClick={() => handleOpenEmployeeModal()}>
                <Plus className="w-4 h-4 mr-2" />
                CREAR PRIMER EMPLEADO
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleOpenEmployeeModal(employee)}>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    {employee.photo ? (
                      <img src={employee.photo} alt={employee.fullName} className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xl font-bold text-primary">{getInitials(employee.fullName)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{employee.fullName}</h3>
                      <p className="text-sm text-gray-500 truncate">{employee.employeeCode}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 truncate">{employee.position}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 truncate">{employee.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">C$ {employee.salary.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge className={employee.status === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                      {employee.status}
                    </Badge>
                    {permissions.canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteEmployee(employee.id)
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : payrolls.filter(p => 
          !searchTerm.trim() || 
          p.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
        ).length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No hay planillas cargadas</p>
            <Button onClick={() => setShowPayrollModal(true)}>Cargar primera planilla</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payrolls.filter(p => 
            !searchTerm.trim() || 
            (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
          ).map((payroll) => (
            <Card key={payroll.id} className="group relative border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${
                payroll.status === 'PAGADA' ? 'bg-success' : payroll.status === 'PROCESADA' ? 'bg-primary' : 'bg-warning'
              }`}></div>
              
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <input
                    type="checkbox"
                    checked={selectedPayrolls.has(payroll.id)}
                    onChange={() => togglePayrollSelection(payroll.id)}
                    className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1 truncate">
                      {payroll.name || 'Planilla General'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{payroll.period}</p>
                  </div>
                  <Badge variant={payroll.status === 'PAGADA' ? 'success' : payroll.status === 'PROCESADA' ? 'info' : 'warning'}>
                    {payroll.status}
                  </Badge>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Monto Total</span>
                    <span className="text-lg font-black text-slate-900">{formatCurrency(payroll.totalAmount)}</span>
                  </div>
                  {payroll.expense && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      <span className="text-[10px] font-bold text-purple-700 uppercase">EXT: {payroll.expense.refNumber}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{payroll.fileName}</span>
                  </div>
                  {payroll.notes && (
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 italic">
                      {`"${payroll.notes}"`}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-auto">
                  <a
                    href={payroll.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-[10px] font-bold p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-center uppercase tracking-widest transition-colors"
                    title="Descargar archivo de planilla"
                  >
                    Ver Documentos
                  </a>
                  <select
                    value={payroll.status}
                    onChange={(e) => handleStatusChange(payroll.id, e.target.value)}
                    className="w-24 text-[10px] font-bold px-2 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-primary/20 cursor-pointer uppercase tracking-tight"
                  >
                    <option value="PENDIENTE">PEND.</option>
                    <option value="PROCESADA">PROC.</option>
                    <option value="PAGADA">PAGADA</option>
                  </select>
                  {permissions.canDelete && (
                    <button
                      onClick={() => handleDelete(payroll.id)}
                      className="p-2 text-slate-300 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal para cargar planilla */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Cargar Planilla</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input
                label="Nombre / Empleado"
                placeholder="Ej: Juan Pérez o Planilla de Ventas"
                value={payrollForm.name}
                onChange={(e) => setPayrollForm({ ...payrollForm, name: e.target.value })}
                required
                fullWidth
              />
              <Input
                label="Período"
                placeholder="Ej: Enero 2026"
                value={payrollForm.period}
                onChange={(e) => setPayrollForm({ ...payrollForm, period: e.target.value })}
                required
                fullWidth
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total de la Planilla *
                  <span className="ml-1 text-xs font-normal text-gray-400">(suma total de salarios a pagar)</span>
                </label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-sm text-gray-600">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={payrollForm.totalAmount}
                    onChange={(e) => setPayrollForm({ ...payrollForm, totalAmount: e.target.value })}
                    required
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Este monto se registrará como gasto de nómina si activas la opción de abajo.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Archivo de planilla (Excel, PDF, etc.)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.pdf,.csv"
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">Archivo: {selectedFile.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={payrollForm.notes}
                  onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createExpense"
                  checked={false}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-primary border-gray-300"
                />
                <label htmlFor="createExpense" className="text-sm text-gray-700">
                  Crear gasto automáticamente en el módulo de Gastos
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPayrollModal(false)
                    setPayrollForm({ name: '', period: '', totalAmount: '', notes: '', createExpense: true })
                    setSelectedFile(null)
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? 'Cargando...' : 'Guardar Planilla'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de explicación de plantilla */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Plantilla de Nómina</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-blue-900 mb-2">¿Para qué sirve la plantilla?</h3>
                <p className="text-sm text-blue-800">
                  La plantilla te permite registrar múltiples empleados de forma masiva. Incluye campos profesionales 
                  como nombre, cédula, cargo, departamento, salario, fecha de ingreso, tipo de contrato y más.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900">Campos incluidos:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Nombre</p>
                      <p className="text-xs text-gray-500">Nombre completo del empleado</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cédula</p>
                      <p className="text-xs text-gray-500">Documento de identidad</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Cargo</p>
                      <p className="text-xs text-gray-500">Puesto de trabajo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Departamento</p>
                      <p className="text-xs text-gray-500">Área de trabajo</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Salario</p>
                      <p className="text-xs text-gray-500">Salario mensual</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tipo de Contrato</p>
                      <p className="text-xs text-gray-500">Indefinido, temporal, etc.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-amber-900 mb-2">Cómo usar la plantilla:</h3>
                <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                  <li>Descarga la plantilla haciendo clic en &quot;Descargar Plantilla&quot;</li>
                  <li>Llena los datos de tus empleados siguiendo el ejemplo incluido</li>
                  <li>Guarda el archivo Excel con todos los empleados</li>
                  <li>Usa el botón &quot;IMPORTAR&quot; para subir el archivo con múltiples empleados</li>
                  <li>El sistema creará automáticamente los registros de nómina</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-green-900 mb-2">💡 Consejo:</h3>
                <p className="text-sm text-green-800">
                  Puedes descargar la plantilla, llenarla con tus datos, y luego volver a importarla con más empleados. 
                  El sistema agregará los nuevos registros sin duplicar los existentes.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleConfirmDownloadTemplate} className="flex-1 bg-primary hover:bg-primary-dark">
                Descargar Plantilla
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Empleado con 20 campos */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
              <button onClick={() => setShowEmployeeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Foto de perfil */}
              <div className="flex flex-col items-center gap-4 pb-6 border-b">
                <div className="relative">
                  {employeeForm.photo ? (
                    <img src={employeeForm.photo} alt="Foto" className="w-32 h-32 rounded-full object-cover" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer hover:bg-primary/90">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                </div>
                {uploadingPhoto && <p className="text-sm text-gray-500">Subiendo foto...</p>}
              </div>

              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Código de Empleado *"
                  value={employeeForm.employeeCode}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
                  placeholder="EMP001"
                  required
                  disabled={isEditing}
                />
                <Input
                  label="Nombre Completo *"
                  value={employeeForm.fullName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                  placeholder="Juan Pérez López"
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  placeholder="juan@empresa.com"
                />
                <Input
                  label="Teléfono"
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  placeholder="8888-1234"
                />
              </div>

              {/* Información laboral */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Puesto *"
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  placeholder="Gerente de Ventas"
                  required
                />
                <Input
                  label="Departamento *"
                  value={employeeForm.department}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                  placeholder="Ventas"
                  required
                />
                <Input
                  label="Fecha de Ingreso *"
                  type="date"
                  value={employeeForm.startDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, startDate: e.target.value })}
                  required
                />
                <Input
                  label="Salario (C$) *"
                  type="number"
                  step="0.01"
                  value={employeeForm.salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                  placeholder="15000.00"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contrato *</label>
                  <select
                    value={employeeForm.contractType}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, contractType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="Indefinido">Indefinido</option>
                    <option value="Temporal">Temporal</option>
                    <option value="Por Proyecto">Por Proyecto</option>
                    <option value="Pasantía">Pasantía</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                  <select
                    value={employeeForm.status}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
                    <option value="VACACIONES">Vacaciones</option>
                    <option value="LICENCIA">Licencia</option>
                  </select>
                </div>
              </div>

              {/* Información bancaria (colapsable) */}
              <button type="button" onClick={() => setShowBankSection(!showBankSection)} className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100">
                {showBankSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Building2 className="w-4 h-4 text-gray-500" />
                Información Bancaria <span className="text-gray-400 font-normal">(opcional)</span>
              </button>
              {showBankSection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Banco"
                  value={employeeForm.bankName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, bankName: e.target.value })}
                  placeholder="BAC"
                />
                <Input
                  label="Número de Cuenta"
                  value={employeeForm.accountNumber}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, accountNumber: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
              )}

              {/* Información personal (colapsable) */}
              <button type="button" onClick={() => setShowPersonalSection(!showPersonalSection)} className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100">
                {showPersonalSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <User className="w-4 h-4 text-gray-500" />
                Información Personal <span className="text-gray-400 font-normal">(opcional)</span>
              </button>
              {showPersonalSection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Dirección"
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                  placeholder="Managua, Nicaragua"
                />
                <Input
                  label="Fecha de Nacimiento"
                  type="date"
                  value={employeeForm.birthDate}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, birthDate: e.target.value })}
                />
                <Input
                  label="Contacto de Emergencia"
                  value={employeeForm.emergencyContact}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContact: e.target.value })}
                  placeholder="María López"
                />
                <Input
                  label="Teléfono de Emergencia"
                  value={employeeForm.emergencyPhone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyPhone: e.target.value })}
                  placeholder="8888-5678"
                />
              </div>
              )}

              {/* Información adicional (colapsable) */}
              <button type="button" onClick={() => setShowExtraSection(!showExtraSection)} className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100">
                {showExtraSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Shield className="w-4 h-4 text-gray-500" />
                Información Adicional <span className="text-gray-400 font-normal">(opcional)</span>
              </button>
              {showExtraSection && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Número de Seguro Social"
                  value={employeeForm.socialSecurityNumber}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, socialSecurityNumber: e.target.value })}
                  placeholder="001-123456-0001A"
                />
                <Input
                  label="Tipo de Sangre"
                  value={employeeForm.bloodType}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, bloodType: e.target.value })}
                  placeholder="O+"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Educación</label>
                  <select
                    value={employeeForm.educationLevel}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, educationLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Secundaria">Secundaria</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Licenciatura">Licenciatura</option>
                    <option value="Maestría">Maestría</option>
                    <option value="Doctorado">Doctorado</option>
                  </select>
                </div>
              </div>
              )}

              {/* Beneficios y notas (colapsable) */}
              <button type="button" onClick={() => setShowBenefitsSection(!showBenefitsSection)} className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 px-4 py-2 rounded-lg hover:bg-gray-100">
                {showBenefitsSection ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Heart className="w-4 h-4 text-gray-500" />
                Beneficios y Notas <span className="text-gray-400 font-normal">(opcional)</span>
              </button>
              {showBenefitsSection && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beneficios</label>
                  <textarea
                    value={employeeForm.benefits}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, benefits: e.target.value })}
                    placeholder="Seguro médico, bonos trimestrales, vehículo empresa..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={employeeForm.notes}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })}
                    placeholder="Observaciones adicionales..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmployeeModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              {(isEditing ? permissions.canEdit : permissions.canCreate) && (
                <Button
                  onClick={handleSaveEmployee}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? 'Guardando...' : isEditing ? 'Actualizar Empleado' : 'Crear Empleado'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importación de Empleados */}
      {showEmployeeImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Importar Empleados desde Excel</h2>
              <button onClick={() => { setShowEmployeeImportModal(false); setEmployeeImportFile(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Archivo Excel</label>
                <button onClick={handleDownloadEmployeeTemplate} className="text-sm text-primary hover:underline flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  Descargar Plantilla (10 ejemplos)
                </button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setEmployeeImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="employee-import-file"
                />
                {!employeeImportFile ? (
                  <label htmlFor="employee-import-file" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Haz clic para seleccionar archivo</p>
                    <p className="text-xs text-gray-400 mt-1">Formatos: .xlsx, .xls</p>
                  </label>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    <span className="text-sm text-gray-700">{employeeImportFile.name}</span>
                    <button onClick={() => setEmployeeImportFile(null)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="createExpenseFromImport"
                  checked={createExpenseFromImport}
                  onChange={(e) => setCreateExpenseFromImport(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-gray-300"
                />
                <label htmlFor="createExpenseFromImport" className="text-sm text-gray-700">
                  <span className="font-medium">Crear gasto de nómina automáticamente</span>
                  <span className="block text-xs text-gray-500 mt-1">
                    Se creará un gasto por la suma total de salarios importados
                  </span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowEmployeeImportModal(false); setEmployeeImportFile(null) }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportEmployees}
                disabled={!employeeImportFile || importingEmployees}
                className="flex-1"
              >
                {importingEmployees ? 'Importando...' : 'Importar Empleados'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
