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
}

interface Department {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  companyId: string
  department: Department | null
}

type UserFlags = { isApprover: boolean; isReceiver: boolean; isBuyer: boolean }

export function DepartmentAssignmentsModal({ isOpen, onClose, companyId, department }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({})
  const [flags, setFlags] = useState<Record<string, UserFlags>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && department) {
      fetchData()
    }
  }, [isOpen, department?.id])

  async function fetchData() {
    if (!department) return
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}` }

      const [uRes, aRes] = await Promise.all([
        fetch(`/api/companies/${companyId}/users`, { headers }),
        fetch(`/api/department-assignments?companyId=${companyId}&departmentId=${department.id}`, { headers }),
      ])
      const [uData, aData] = await Promise.all([uRes.json(), aRes.json()])

      const userList: User[] = uData.success
        ? uData.data.map((m: any) => ({ id: m.user.id, name: m.user.name, email: m.user.email }))
        : []

      const map: Record<string, Assignment> = {}
      const initialFlags: Record<string, UserFlags> = {}
      if (aData.success) {
        for (const a of aData.data) {
          map[a.userId] = {
            id: a.id,
            userId: a.userId,
            isApprover: a.isApprover,
            isReceiver: a.isReceiver,
            isBuyer: a.isBuyer,
          }
        }
      }
      for (const u of userList) {
        initialFlags[u.id] = {
          isApprover: map[u.id]?.isApprover ?? false,
          isReceiver: map[u.id]?.isReceiver ?? false,
          isBuyer: map[u.id]?.isBuyer ?? false,
        }
      }
      setUsers(userList)
      setAssignments(map)
      setFlags(initialFlags)
    } catch {
      setError('Error al cargar datos')
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
    if (!department) return
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('accessToken')
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      const ops: Promise<any>[] = []
      for (const u of users) {
        const f = flags[u.id]
        if (!f) continue
        const hasAny = f.isApprover || f.isReceiver || f.isBuyer
        const existing = assignments[u.id]

        if (hasAny && !existing) {
          ops.push(
            fetch('/api/department-assignments', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                userId: u.id,
                departmentId: department.id,
                isApprover: f.isApprover,
                isReceiver: f.isReceiver,
                isBuyer: f.isBuyer,
              }),
            })
          )
        } else if (hasAny && existing) {
          ops.push(
            fetch(`/api/department-assignments/${existing.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                isApprover: f.isApprover,
                isReceiver: f.isReceiver,
                isBuyer: f.isBuyer,
              }),
            })
          )
        } else if (!hasAny && existing) {
          ops.push(
            fetch(`/api/department-assignments/${existing.id}`, {
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
        <p className="text-sm text-slate-500">
          Marca los permisos para cada usuario del departamento <span className="font-semibold text-slate-700">{department?.name}</span>. Los permisos son combinables.
        </p>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">Cargando...</div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">No hay usuarios en esta empresa.</div>
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
                {users.map((u) => {
                  const f = flags[u.id] ?? { isApprover: false, isReceiver: false, isBuyer: false }
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
          <Button onClick={handleSave} disabled={saving || isLoading || users.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
