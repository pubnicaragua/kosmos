'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui-kit/Modal'
import { Button } from '@/components/ui-kit/Button'
import { Save } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
}

interface Assignment {
  id: string
  userId: string
  isApprover: boolean
  isReceiver: boolean
  isBuyer: boolean
  departmentId: string
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
}: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [existingAssignments, setExistingAssignments] = useState<Record<string, Assignment[]>>({})
  const [flags, setFlags] = useState<Record<string, UserFlags>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    } else {
      setUsers([])
      setExistingAssignments({})
      setFlags({})
    }
  }, [isOpen])

  async function fetchData() {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      // Obtener todos los usuarios de la empresa
      const uRes = await fetch(`/api/companies/${companyId}/users`, { headers })
      const uData = await uRes.json()

      if (!uRes.ok || !uData.success) {
        setError(uData.error || 'Error al cargar usuarios')
        setIsLoading(false)
        return
      }

      const companyUsers = uData.data.map((m: any) => m.user)
      setUsers(companyUsers)

      // Obtener todas las asignaciones de la empresa
      const aRes = await fetch(`/api/department-assignments?companyId=${companyId}`, { headers, cache: 'no-store' })
      const aData = await aRes.json()

      if (!aRes.ok || !aData.success) {
        setError(aData.error || 'Error al cargar asignaciones')
        setIsLoading(false)
        return
      }

      const assignmentsByUserId: Record<string, Assignment[]> = {}
      const initialFlags: Record<string, UserFlags> = {}

      for (const a of aData.data) {
        if (!assignmentsByUserId[a.userId]) assignmentsByUserId[a.userId] = []
        assignmentsByUserId[a.userId].push({
          id: a.id,
          userId: a.userId,
          departmentId: a.departmentId,
          isApprover: a.isApprover,
          isReceiver: a.isReceiver,
          isBuyer: a.isBuyer,
        })

        if (!initialFlags[a.userId]) {
          initialFlags[a.userId] = { isApprover: a.isApprover, isReceiver: a.isReceiver, isBuyer: a.isBuyer }
        } else {
          initialFlags[a.userId].isApprover ||= a.isApprover
          initialFlags[a.userId].isReceiver ||= a.isReceiver
          initialFlags[a.userId].isBuyer ||= a.isBuyer
        }
      }

      setExistingAssignments(assignmentsByUserId)
      
      // Asegurar que todos los usuarios tengan flags inicializados
      const completeFlags = { ...initialFlags }
      for (const user of companyUsers) {
        if (!completeFlags[user.id]) {
          completeFlags[user.id] = { isApprover: false, isReceiver: false, isBuyer: false }
        }
      }
      setFlags(completeFlags)

    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error de red al cargar datos')
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
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      const ops: Promise<any>[] = []

      for (const user of users) {
        const f = flags[user.id]
        if (!f) continue
        
        const userAssignments = existingAssignments[user.id] || []
        const hasAnyFlags = f.isApprover || f.isReceiver || f.isBuyer

        if (userAssignments.length > 0) {
          // Actualizar todas las asignaciones existentes del usuario
          for (const a of userAssignments) {
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
          }
        } else if (hasAnyFlags && departments.length > 0) {
          // Si no tiene asignaciones pero se le marcaron permisos, crear una en el primer departamento disponible
          ops.push(
            fetch('/api/department-assignments', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                userId: user.id,
                departmentId: departments[0].id,
                isApprover: f.isApprover,
                isReceiver: f.isReceiver,
                isBuyer: f.isBuyer,
              }),
            })
          )
        }
      }

      const results = await Promise.all(ops)
      const failed: string[] = []
      for (const r of results) {
        if (!r.ok) {
          try {
            const d = await r.json()
            failed.push(d.error || `HTTP ${r.status}`)
          } catch {
            failed.push(`HTTP ${r.status}`)
          }
        }
      }
      if (failed.length > 0) {
        setError(`Error: ${failed.join(', ')}`)
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
        <p className="text-sm text-slate-500">
          Marca los permisos para cada usuario. Los permisos aplican a nivel de sistema.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No hay usuarios en la empresa</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[60vh]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
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
                {users.map((u) => {
                  const f = flags[u.id] || { isApprover: false, isReceiver: false, isBuyer: false }
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{u.name}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.isApprover}
                          onChange={() => toggle(u.id, 'isApprover')}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.isReceiver}
                          onChange={() => toggle(u.id, 'isReceiver')}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={f.isBuyer}
                          onChange={() => toggle(u.id, 'isBuyer')}
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
            disabled={saving || isLoading || users.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
