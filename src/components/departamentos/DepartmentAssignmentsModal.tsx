'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui-kit/Modal'
import { Button } from '@/components/ui-kit/Button'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

interface Department {
  id: string
  name: string
}

interface Assignment {
  id: string
  userId: string
  departmentId: string
  role: string | null
  isApprover: boolean
  isReceiver: boolean
  isBuyer: boolean
  user: User
  department: Department
}

interface DepartmentAssignmentsModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
}

interface FormState {
  userId: string
  departmentId: string
  role: string
  isApprover: boolean
  isReceiver: boolean
  isBuyer: boolean
}

const emptyForm: FormState = {
  userId: '',
  departmentId: '',
  role: '',
  isApprover: false,
  isReceiver: false,
  isBuyer: false,
}

export function DepartmentAssignmentsModal({
  isOpen,
  onClose,
  companyId,
}: DepartmentAssignmentsModalProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm)
  const [isCreating, setIsCreating] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(emptyForm)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchAll()
    }
  }, [isOpen, companyId])

  async function fetchAll() {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      const [aRes, uRes, dRes] = await Promise.all([
        fetch(`/api/department-assignments?companyId=${companyId}`, { headers }),
        fetch(`/api/companies/${companyId}/users`, { headers }),
        fetch(`/api/departments?companyId=${companyId}`, { headers }),
      ])

      const [aData, uData, dData] = await Promise.all([aRes.json(), uRes.json(), dRes.json()])

      if (aData.success) setAssignments(aData.data)
      if (uData.success) {
        setUsers(
          uData.data.map((m: any) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
          }))
        )
      }
      if (dData.success) {
        setDepartments(dData.data.map((d: any) => ({ id: d.id, name: d.name })))
      }
    } catch (e) {
      setError('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }

  function startEdit(a: Assignment) {
    setEditingId(a.id)
    setEditForm({
      userId: a.userId,
      departmentId: a.departmentId,
      role: a.role || '',
      isApprover: a.isApprover,
      isReceiver: a.isReceiver,
      isBuyer: a.isBuyer,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  async function saveEdit() {
    if (!editingId) return
    setSavingId(editingId)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/department-assignments/${editingId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: editForm.role,
          isApprover: editForm.isApprover,
          isReceiver: editForm.isReceiver,
          isBuyer: editForm.isBuyer,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Error al guardar')
        return
      }
      setAssignments((prev) => prev.map((a) => (a.id === editingId ? data.data : a)))
      cancelEdit()
    } catch {
      setError('Error al guardar cambios')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta asignación?')) return
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/department-assignments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Error al eliminar')
        return
      }
      setAssignments((prev) => prev.filter((a) => a.id !== id))
    } catch {
      setError('Error al eliminar')
    }
  }

  async function handleCreate() {
    if (!createForm.userId || !createForm.departmentId) {
      setError('Selecciona usuario y departamento')
      return
    }
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/department-assignments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: createForm.userId,
          departmentId: createForm.departmentId,
          role: createForm.role,
          isApprover: createForm.isApprover,
          isReceiver: createForm.isReceiver,
          isBuyer: createForm.isBuyer,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Error al crear asignación')
        return
      }
      setAssignments((prev) => [...prev, data.data])
      setCreateForm(emptyForm)
      setIsCreating(false)
    } catch {
      setError('Error al crear asignación')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignaciones por departamento" size="xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Aprobador, receptor y comprador son combinables. Un usuario puede tener varios roles en el mismo o distintos departamentos.
          </p>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nueva asignación
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isCreating && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-700">Nueva asignación</div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Usuario</label>
                <select
                  value={createForm.userId}
                  onChange={(e) => setCreateForm({ ...createForm, userId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar usuario</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Departamento</label>
                <select
                  value={createForm.departmentId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, departmentId: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar departamento</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold uppercase text-slate-500">Rol (opcional)</label>
                <input
                  type="text"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  placeholder="Ej: Coordinador, Analista..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-4">
                <PermChecks
                  value={createForm}
                  onChange={setCreateForm}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreating(false)
                  setCreateForm(emptyForm)
                }}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate}>
                Crear asignación
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Cargando...</div>
        ) : assignments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No hay asignaciones. Crea la primera.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Usuario
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Departamento
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Rol
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Aprob.
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Recep.
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Comp.
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const isEditing = editingId === a.id
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <select
                            value={editForm.userId}
                            onChange={(e) =>
                              setEditForm({ ...editForm, userId: e.target.value })
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            disabled
                          >
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-900">{a.user.name}</div>
                            <div className="text-xs text-slate-500">{a.user.email}</div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {isEditing ? (
                          <select
                            value={editForm.departmentId}
                            onChange={(e) =>
                              setEditForm({ ...editForm, departmentId: e.target.value })
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            disabled
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          a.department.name
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.role}
                            onChange={(e) =>
                              setEditForm({ ...editForm, role: e.target.value })
                            }
                            className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                            placeholder="Opcional"
                          />
                        ) : (
                          a.role || '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editForm.isApprover}
                            onChange={(e) =>
                              setEditForm({ ...editForm, isApprover: e.target.checked })
                            }
                          />
                        ) : a.isApprover ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editForm.isReceiver}
                            onChange={(e) =>
                              setEditForm({ ...editForm, isReceiver: e.target.checked })
                            }
                          />
                        ) : a.isReceiver ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-cyan-500" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={editForm.isBuyer}
                            onChange={(e) =>
                              setEditForm({ ...editForm, isBuyer: e.target.checked })
                            }
                          />
                        ) : a.isBuyer ? (
                          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={savingId === a.id}
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                              title="Guardar"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => startEdit(a)}
                              className="rounded p-1 text-slate-600 hover:bg-slate-100"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

function PermChecks({
  value,
  onChange,
}: {
  value: FormState
  onChange: (v: FormState) => void
}) {
  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.isApprover}
          onChange={(e) => onChange({ ...value, isApprover: e.target.checked })}
        />
        <span className="font-medium">Aprobador</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.isReceiver}
          onChange={(e) => onChange({ ...value, isReceiver: e.target.checked })}
        />
        <span className="font-medium">Receptor</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.isBuyer}
          onChange={(e) => onChange({ ...value, isBuyer: e.target.checked })}
        />
        <span className="font-medium">Comprador</span>
      </label>
    </>
  )
}
