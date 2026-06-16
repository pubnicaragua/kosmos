'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui-kit/Card'
import { Button } from '@/components/ui-kit/Button'
import { Input } from '@/components/ui-kit/Input'
import { Modal } from '@/components/ui-kit/Modal'
import { Badge } from '@/components/ui-kit/Badge'
import { Building2, Users, Plus, Edit2, Trash2, UserCheck, UserCog } from 'lucide-react'
import { DepartmentAssignmentsModal } from '@/components/departamentos/DepartmentAssignmentsModal'

interface Department {
  id: string
  name: string
  description: string | null
  isActive: boolean
  userDepartments: {
    userId: string
    role: string | null
    isApprover: boolean
    isReceiver: boolean
  }[]
  _count: {
    userDepartments: number
    purchaseRequests: number
  }
}

interface DepartamentosManagerProps {
  companyId: string
}

export function DepartamentosManager({ companyId }: DepartamentosManagerProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [permissionsDept, setPermissionsDept] = useState<Department | null>(null)

  useEffect(() => {
    if (companyId) {
      fetchDepartments()
    }
  }, [companyId])

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/departments?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setDepartments(data.data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        description: dept.description || '',
      })
    } else {
      setEditingDept(null)
      setFormData({ name: '', description: '' })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const url = editingDept
        ? `/api/departments/${editingDept.id}`
        : '/api/departments'
      const method = editingDept ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          ...formData,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setShowModal(false)
        fetchDepartments()
      } else {
        alert(data.error || 'Error al guardar departamento')
      }
    } catch (error) {
      console.error('Error saving department:', error)
      alert('Error al guardar departamento')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este departamento?')) return

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      if (data.success) {
        fetchDepartments()
      } else {
        alert(data.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error deleting department:', error)
      alert('Error al eliminar departamento')
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Cargando departamentos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Departamentos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona los departamentos y asigna usuarios aprobadores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Departamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map(dept => (
          <Card key={dept.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-gray-900">{dept.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenModal(dept)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            {dept.description && (
              <p className="text-sm text-gray-600 mb-3">{dept.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{dept._count.userDepartments} usuarios</span>
              </div>
              <div className="flex items-center gap-1">
                <UserCheck className="w-4 h-4" />
                <span>
                  {dept.userDepartments.filter(ud => ud.isApprover).length} aprobadores
                </span>
              </div>
              <div className="flex items-center gap-1">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>
                  {dept.userDepartments.filter(ud => ud.isReceiver).length} receptores
                </span>
              </div>
            </div>

            {dept._count.purchaseRequests > 0 && (
              <div className="mt-2">
                <Badge variant="default">
                  {dept._count.purchaseRequests} solicitudes
                </Badge>
              </div>
            )}

            <div className="mt-3 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setPermissionsDept(dept)}
              >
                <UserCog className="w-4 h-4 mr-2" />
                Permisos solicitud de compra
              </Button>
            </div>
          </Card>
        ))}

        {departments.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No hay departamentos creados. Crea el primero.
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
        size="xl"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Departamento"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Compras, Ventas, RRHH"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Descripción opcional del departamento"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Los permisos de usuarios se gestionan desde el botón <strong>Permisos solicitud de compra</strong> en cada departamento.
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              {editingDept ? 'Actualizar' : 'Crear'} Departamento
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <DepartmentAssignmentsModal
        isOpen={permissionsDept !== null}
        onClose={() => setPermissionsDept(null)}
        companyId={companyId}
        department={permissionsDept}
      />
    </div>
  )
}
