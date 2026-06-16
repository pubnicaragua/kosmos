'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui-kit/Modal'
import { Button } from '@/components/ui-kit/Button'
import { Save } from 'lucide-react'

interface Assignment {
  id: string
  userId: string
  isApprover: boolean
  isReceiver: boolean
  isBuyer: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface Department {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  companyId: string
  departments: Department[]
  initialDepartmentId?: string | null
}

type UserFlags = { isApprover: boolean; isReceiver: boolean; isBuyer: boolean }

export function DepartmentAssignmentsModal({
  isOpen,
  onClose,
  companyId,
  departments,
  initialDepartmentId,
}: Props) {
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [flags, setFlags] = useState<Record<string, UserFlags>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialDepartmentId) {
        setSelectedDeptId(initialDepartmentId)
      } else if (departments.length === 1) {
        setSelectedDeptId(departments[0].id)
      } else {
        setSelectedDeptId('')
      }
    }
  }, [isOpen, initialDepartmentId, departments])

  useEffect(() => {
    if (isOpen && selectedDeptId) {
      fetchData()
    } else {
      setAssignments({})
      setFlags({})
    }
  }, [isOpen, selectedDeptId])

  async function fetchData() {
    if (!selectedDeptId) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      const aRes = await fetch(
        `/api/department-assignments?companyId=${companyId}&departmentId=${selectedDeptId}`,
        { headers, cache: 'no-store' }
      )
      const aData = await aRes.json()

      if (!aRes.ok || !aData.success) {
        setError(aData.error || `Error ${aRes.status} al cargar asignaciones`)
        setAssignments({})
        setFlags({})
        return
      }

      const map: Record<string, Assignment> = {}
      const initialFlags: Record<string, UserFlags> = {}
      for (const a of aData.data) {
        map[a.userId] = {
          id: a.id,
          userId: a.userId,
          isApprover: a.isApprover,
          isReceiver: a.isReceiver,
          isBuyer: a.isBuyer,
          user: a.user,
        }
        initialFlags[a.userId] = {
          isApprover: a.isApprover,
          isReceiver: a.isReceiver,
          isBuyer: a.isBuyer,
        }
      }
      setAssignments(map)
      setFlags(initialFlags)
    } catch (err) {
      console.error('Error cargando asignaciones:', err)
      setError('Error de red al cargar asignaciones')
    } finally {
      setIsLoading(false)
    }
  }

  function toggle(userId: string, field: keyof UserFlags) {
    setFlags((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: !prev[userId]?.[field] },
    }))
  }

  async function handleSave() {
    if (!selectedDeptId) return
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      const ops: Promise<any>[] = []
      for (const a of Object.values(assignments)) {
        const f = flags[a.userId]
        if (!f) continue
        const hasAny = f.isApprover || f.isReceiver || f.isBuyer

        if (hasAny) {
          ops.push(
            fetch(`/api/department-assignments/${a.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                isApprover: f.isApprover,
                isReceiver: f.isReceiver,
                isBuyer: f.isBuyer,
              }),
            })
          )
        } else {
          ops.push(
            fetch(`/api/department-assignments/${a.id}`, {
              method: 'DELETE',
              headers,
            })
          )
        }
      }

      const results = await Promise.all(ops)
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        setError(`${failed.length} operación(es) fallaron`)
        return
      }
      onClose()
    } catch {
      setError('Error al guardar permisos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Permisos solicitud de compra"
      size="lg"
    >
      <div className="space-y-4">
        {departments.length > 1 && (
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Departamento
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="">Seleccionar departamento</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedDeptId && (
          <p className="text-sm text-slate-500">
            Marca los permisos para cada usuario. Los permisos son combinables.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Cargando...</div>
        ) : Object.keys(assignments).length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No hay usuarios en este departamento</p>
            <p className="mt-1 text-xs text-slate-500">
              Agrega usuarios desde el modal de Editar Departamento para poder asignarles permisos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Usuario
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Aprobador
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Receptor
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Comprador
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(assignments).map((a) => {
                  const f = flags[a.userId] ?? {
                    isApprover: a.isApprover,
                    isReceiver: a.isReceiver,
                    isBuyer: a.isBuyer,
                  }
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{a.user.name}</div>
                        <div className="text-xs text-slate-500">{a.user.email}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.isApprover}
                          onChange={() => toggle(a.userId, 'isApprover')}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.isReceiver}
                          onChange={() => toggle(a.userId, 'isReceiver')}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.isBuyer}
                          onChange={() => toggle(a.userId, 'isBuyer')}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || isLoading || Object.keys(assignments).length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
