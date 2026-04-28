'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

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

export default function EmpleadoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchEmployee = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch(`/api/employees/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success) {
          setEmployee(data.data)
        } else {
          alert('Error al cargar empleado')
          router.push('/recursos-humanos')
        }
      } catch (error) {
        console.error('Error fetching employee:', error)
        alert('Error al cargar empleado')
        router.push('/recursos-humanos')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployee()
  }, [params.id, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando empleado...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Empleado no encontrado</p>
          <Button onClick={() => router.push('/recursos-humanos')} className="mt-4">
            Volver a RRHH
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <button onClick={() => router.push('/recursos-humanos')} className="hover:text-primary">
              RECURSOS HUMANOS
            </button>
            <span>&gt;</span>
            <span className="text-primary font-medium">PERFIL DE EMPLEADO</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">{employee.fullName}</h1>
          <p className="text-sm text-gray-500 mt-1">{employee.position} - {employee.department}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={employee.status === 'ACTIVO' ? 'success' : 'default'}>
            {employee.status}
          </Badge>
          <Button variant="outline" onClick={() => router.push('/recursos-humanos')}>
            Volver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Personal */}
        <Card className="lg:col-span-2">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Información Personal</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Código de Empleado</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{employee.employeeCode}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Nombre Completo</label>
              <p className="mt-1 text-sm text-gray-900">{employee.fullName}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
              <p className="mt-1 text-sm text-gray-900">{employee.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Teléfono</label>
              <p className="mt-1 text-sm text-gray-900">{employee.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Fecha de Nacimiento</label>
              <p className="mt-1 text-sm text-gray-900">
                {employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('es-ES') : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Tipo de Sangre</label>
              <p className="mt-1 text-sm text-gray-900">{employee.bloodType || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Dirección</label>
              <p className="mt-1 text-sm text-gray-900">{employee.address || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Nivel Educativo</label>
              <p className="mt-1 text-sm text-gray-900">{employee.educationLevel || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Información Laboral */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Información Laboral</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Puesto</label>
              <p className="mt-1 text-sm text-gray-900">{employee.position}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Departamento</label>
              <p className="mt-1 text-sm text-gray-900">{employee.department}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Fecha de Inicio</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(employee.startDate).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Tipo de Contrato</label>
              <p className="mt-1 text-sm text-gray-900">{employee.contractType}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Salario</label>
              <p className="mt-1 text-sm text-gray-900 font-semibold">
                ${employee.salary.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        {/* Información Bancaria */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Información Bancaria</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Banco</label>
              <p className="mt-1 text-sm text-gray-900">{employee.bankName || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Número de Cuenta</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{employee.accountNumber || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Seguro Social</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{employee.socialSecurityNumber || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Contacto de Emergencia */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Contacto de Emergencia</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Nombre</label>
              <p className="mt-1 text-sm text-gray-900">{employee.emergencyContact || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Teléfono</label>
              <p className="mt-1 text-sm text-gray-900">{employee.emergencyPhone || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Beneficios y Notas */}
        <Card className="lg:col-span-3">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Beneficios y Notas</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Beneficios</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{employee.benefits || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Notas</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{employee.notes || 'N/A'}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
