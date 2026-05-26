'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Calendar, AlertTriangle, Send } from 'lucide-react'
import { Button, Card, Select, Input } from '@/components/ui-kit'
import { useCompany } from '@/hooks/useCompany'

export default function AsignarTareaPage() {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const [taskLists, setTaskLists] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    taskListId: '',
    assignedTo: '',
    dueDate: '',
    priority: 'MEDIUM',
    notes: ''
  })

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [selectedCompany])

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const [listsRes, usersRes] = await Promise.all([
        fetch(`/api/task-lists?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/users?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const [listsData, usersData] = await Promise.all([
        listsRes.json(),
        usersRes.json()
      ])

      if (listsData.success) setTaskLists(listsData.data.filter((l: any) => l.isActive))
      if (usersData.success) setUsers(usersData.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.taskListId || !formData.assignedTo) {
      alert('Selecciona una rutina y un colaborador')
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/task-assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: selectedCompany,
          ...formData
        })
      })

      const data = await response.json()
      if (data.success) {
        alert('Tarea asignada exitosamente. El colaborador recibirá una notificación.')
        router.push('/tareas')
      } else {
        alert(data.error || 'Error al asignar tarea')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al asignar tarea')
    } finally {
      setIsSaving(false)
    }
  }

  const selectedList = taskLists.find(l => l.id === formData.taskListId)

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/tareas')} className="rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black text-slate-900">Asignar Tarea</h1>
          <p className="text-sm text-slate-500 mt-1">Asigna una rutina a un colaborador</p>
        </div>
      </div>

      <Card className="p-8 border-slate-100 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Rutina *</label>
          <Select
            options={[
              { value: '', label: 'Seleccionar rutina...' },
              ...taskLists.map(l => ({ value: l.id, label: `${l.name}${l.area ? ` - ${l.area}` : ''}` }))
            ]}
            value={formData.taskListId}
            onChange={(e) => setFormData({ ...formData, taskListId: e.target.value })}
            fullWidth
            className="rounded-xl"
          />
          {selectedList && (
            <div className="mt-3 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-900 font-medium mb-2">{selectedList.description}</p>
              <div className="flex items-center gap-4 text-xs text-blue-700">
                <span>{selectedList.templates?.length || 0} pasos</span>
                <span>•</span>
                <span>Frecuencia: {selectedList.frequency}</span>
                {selectedList.requireEvidence && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Requiere evidencia fotográfica
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Asignar a *</label>
          <Select
            options={[
              { value: '', label: 'Seleccionar colaborador...' },
              ...users.map(u => ({ value: u.id, label: u.name }))
            ]}
            value={formData.assignedTo}
            onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
            fullWidth
            className="rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Fecha límite</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Prioridad</label>
            <Select
              options={[
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'URGENT', label: 'Urgente' }
              ]}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              fullWidth
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Notas adicionales</label>
          <textarea
            className="w-full rounded-xl border-2 border-slate-100 p-4 text-sm focus:border-blue-500 focus:outline-none min-h-[100px]"
            placeholder="Instrucciones especiales o detalles importantes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => router.push('/tareas')}>
            CANCELAR
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.taskListId || !formData.assignedTo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            {isSaving ? 'ASIGNANDO...' : (
              <>
                <Send className="w-4 h-4 mr-2" />
                ASIGNAR TAREA
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-amber-50 border-amber-100">
        <div className="flex gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900 mb-1">El colaborador recibirá una notificación</h3>
            <p className="text-sm text-amber-800">
              Una vez asignada, el colaborador recibirá una notificación push en su dispositivo móvil
              y podrá ver la tarea inmediatamente en su aplicación.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
