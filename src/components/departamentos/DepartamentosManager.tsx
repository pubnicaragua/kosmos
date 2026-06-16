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

interface User {
  id: string
  name: string
  email: string
}

interface DepartamentosManagerProps {
  companyId: string
}

export function DepartamentosManager({ companyId }: DepartamentosManagerProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    userAssignments: [] as { userId: string; role: string; isApprover: boolean; isReceiver: boolean }[],
  })
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false)

  useEffect(() => {
    if (companyId) {
      fetchDepartments()
      fetchUsers()
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

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/companies/${companyId}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.map((m: any) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        })))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleOpenModal = (dept?: Department) => {
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        description: dept.description || '',
        userAssignments: dept.userDepartments.map(ud => ({
          userId: ud.userId,
          role: ud.role || '',
          isApprover: ud.isApprover,
          isReceiver: ud.isReceiver || false,
        })),
      })
    } else {
      setEditingDept(null)
      setFormData({ name: '', description: '', userAssignments: [] })
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

  const addUserAssignment = () => {
    setFormData(prev => ({
      ...prev,
      userAssignments: [...prev.userAssignments, { userId: '', role: '', isApprover: false, isReceiver: false }],
    }))
  }

  const removeUserAssignment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      userAssignments: prev.userAssignments.filter((_, i) => i !== index),
    }))
  }

  const updateUserAssignment = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      userAssignments: prev.userAssignments.map((ua, i) => {
        if (i !== index) return ua

        const newUa = { ...ua, [field]: value }
        if (field === 'isApprover' && value === true) {
          newUa.isReceiver = false
        }
        if (field === 'isReceiver' && value === true) {
          newUa.isApprover = false
        }
        return newUa
      }),
    }))
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
          <Button variant="outline" onClick={() => setShowAssignmentsModal(true)}>
            <UserCog className="w-4 h-4 mr-2" />
            Asignar accesos
          </Button>
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Usuarios Asignados
              </label>
              <Button variant="outline" size="sm" onClick={addUserAssignment}>
                <Plus className="w-4 h-4 mr-1" />
                Agregar Usuario
              </Button>
            </div>

            <div className="space-y-2">
              {formData.userAssignments.map((ua, index) => (
                <div key={index} className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2 bg-gray-50 rounded">
                  <select
                    value={ua.userId}
                    onChange={e => updateUserAssignment(index, 'userId', e.target.value)}
                    className="flex-1 min-w-[150px] px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="">Seleccionar usuario</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={ua.role}
                    onChange={e => updateUserAssignment(index, 'role', e.target.value)}
                    placeholder="Rol"
                    className="w-full md:w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                  />

                  <div className="flex items-center justify-between w-full md:w-auto flex-1 gap-4">
                    <div className="flex gap-4">
                      <label className={`flex items-center gap-1 text-sm whitespace-nowrap ${ua.isReceiver ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={ua.isApprover}
                          onChange={e =>
                            updateUserAssignment(index, 'isApprover', e.target.checked)
                          }
                          disabled={ua.isReceiver}
                          className="rounded disabled:opacity-50"
                        />
                        Aprobador
                      </label>
                      <label className={`flex items-center gap-1 text-sm whitespace-nowrap ${ua.isApprover ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={ua.isReceiver}
                          onChange={e =>
                            updateUserAssignment(index, 'isReceiver', e.target.checked)
                          }
                          disabled={ua.isApprover}
                          className="rounded disabled:opacity-50"
                        />
                        Receptor
                      </label>
                    </div>

                    <button
                      onClick={() => removeUserAssignment(index)}
                      className="p-1 hover:bg-gray-200 rounded ml-auto"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}

              {formData.userAssignments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  No hay usuarios asignados
                </p>
              )}
            </div>
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
        isOpen={showAssignmentsModal}
        onClose={() => setShowAssignmentsModal(false)}
        companyId={companyId}
      />
    </div>
  )
}
