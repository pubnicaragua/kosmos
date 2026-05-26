'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Filter, Search,
  Users, BarChart3, TrendingUp, Calendar, ChevronRight,
  ListChecks, Camera, MapPin, Edit, Trash2
} from 'lucide-react'
import { Button, Card, Badge, Input, Select } from '@/components/ui-kit'
import { useCompany } from '@/hooks/useCompany'
import { useModulePermissions } from '@/hooks/useModulePermissions'

const STATUS_CONFIG: Record<string, any> = {
  PENDING: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  IN_PROGRESS: { label: 'En Progreso', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
  COMPLETED: { label: 'Completada', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  OVERDUE: { label: 'Atrasada', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  CANCELLED: { label: 'Cancelada', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }
}

const PRIORITY_CONFIG: Record<string, any> = {
  LOW: { label: 'Baja', color: 'text-slate-500' },
  MEDIUM: { label: 'Media', color: 'text-blue-600' },
  HIGH: { label: 'Alta', color: 'text-orange-600' },
  URGENT: { label: 'Urgente', color: 'text-red-600' }
}

export default function TareasPage() {
  const router = useRouter()
  const { selectedCompany } = useCompany()
  const permissions = useModulePermissions('tareas', { requireAction: 'view' })
  const [view, setView] = useState<'lists' | 'assignments'>('assignments')
  const [taskLists, setTaskLists] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    if (selectedCompany) {
      fetchData()
    }
  }, [selectedCompany, view])

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setIsLoading(true)
      
      if (view === 'lists') {
        const res = await fetch(`/api/task-lists?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) setTaskLists(data.data)
      } else {
        const res = await fetch(`/api/task-assignments?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setAssignments(data.data)
          calculateStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = (data: any[]) => {
    const total = data.length
    const completed = data.filter(a => a.status === 'COMPLETED').length
    const inProgress = data.filter(a => a.status === 'IN_PROGRESS').length
    const pending = data.filter(a => a.status === 'PENDING').length
    const overdue = data.filter(a => a.status === 'OVERDUE').length
    const avgProgress = data.reduce((sum, a) => sum + (a.progress || 0), 0) / (total || 1)

    setStats({ total, completed, inProgress, pending, overdue, avgProgress })
  }

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.taskList.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         a.assignedToName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (!permissions.canView) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver este módulo</div>
  }

  if (isLoading) {
    return <div className="p-8 text-center">Cargando...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Tareas</h1>
          <p className="text-sm text-slate-500 mt-1">Control total de rutinas y asignaciones en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setView('assignments')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                view === 'assignments' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Asignaciones
            </button>
            <button
              onClick={() => setView('lists')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                view === 'lists' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListChecks className="w-4 h-4 inline mr-2" />
              Rutinas
            </button>
          </div>
          {permissions.canCreate && (
            <Button 
              onClick={() => router.push(view === 'lists' ? '/tareas/rutinas/nueva' : '/tareas/asignar')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              {view === 'lists' ? 'Nueva Rutina' : 'Asignar Tarea'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats KPIs - Only for assignments view */}
      {view === 'assignments' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="p-6 border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
                <p className="text-3xl font-black text-slate-900 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-green-100 bg-green-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Completadas</p>
                <p className="text-3xl font-black text-green-700 mt-2">{stats.completed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-blue-100 bg-blue-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">En Progreso</p>
                <p className="text-3xl font-black text-blue-700 mt-2">{stats.inProgress}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-amber-100 bg-amber-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pendientes</p>
                <p className="text-3xl font-black text-amber-700 mt-2">{stats.pending}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-purple-100 bg-purple-50/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Progreso Promedio</p>
                <p className="text-3xl font-black text-purple-700 mt-2">{Math.round(stats.avgProgress)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      {view === 'assignments' && (
        <Card className="p-6 border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por tarea o colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Select
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'IN_PROGRESS', label: 'En Progreso' },
                { value: 'COMPLETED', label: 'Completada' },
                { value: 'OVERDUE', label: 'Atrasada' }
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </Card>
      )}

      {/* Content */}
      {view === 'assignments' ? (
        <div className="grid grid-cols-1 gap-6">
          {filteredAssignments.length === 0 ? (
            <Card className="p-12 text-center border-slate-100">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-50 rounded-full">
                  <ListChecks className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No hay asignaciones</h3>
                  <p className="text-sm text-slate-500 mt-1">Comienza asignando tareas a tu equipo</p>
                </div>
                {permissions.canCreate && (
                  <Button onClick={() => router.push('/tareas/asignar')} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Asignar Primera Tarea
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            filteredAssignments.map(assignment => {
              const StatusIcon = STATUS_CONFIG[assignment.status].icon
              const statusConfig = STATUS_CONFIG[assignment.status]
              
              return (
                <Card 
                  key={assignment.id} 
                  className="p-6 border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => router.push(`/tareas/${assignment.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={`${statusConfig.color} border-none font-black text-xs px-3 py-1 rounded-full`}>
                          <StatusIcon className="w-3 h-3 mr-1.5" />
                          {statusConfig.label}
                        </Badge>
                        {assignment.priority !== 'MEDIUM' && (
                          <span className={`text-xs font-bold ${PRIORITY_CONFIG[assignment.priority].color}`}>
                            {PRIORITY_CONFIG[assignment.priority].label}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {assignment.taskList.name}
                      </h3>
                      
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{assignment.assignedToName}</span>
                        </div>
                        {assignment.dueDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {assignment.taskList.area && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{assignment.taskList.area}</span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-400">PROGRESO</span>
                          <span className="text-xs font-black text-slate-900">{Math.round(assignment.progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${assignment.progress}%` }}
                          />
                        </div>
                      </div>

                      {assignment.executions && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>
                            {assignment.executions.filter((e: any) => e.completed).length} de {assignment.executions.length} pasos completados
                          </span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Card>
              )
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {taskLists.length === 0 ? (
            <Card className="col-span-full p-12 text-center border-slate-100">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-50 rounded-full">
                  <ListChecks className="w-12 h-12 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">No hay rutinas creadas</h3>
                  <p className="text-sm text-slate-500 mt-1">Crea tu primera rutina para comenzar</p>
                </div>
                {permissions.canCreate && (
                  <Button onClick={() => router.push('/tareas/rutinas/nueva')} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Rutina
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            taskLists.map(list => (
              <Card 
                key={list.id} 
                className="p-6 border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/tareas/rutinas/${list.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <ListChecks className="w-6 h-6 text-blue-600" />
                  </div>
                  {list.isActive ? (
                    <Badge className="bg-green-100 text-green-700 border-none text-xs font-bold">Activa</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 border-none text-xs font-bold">Inactiva</Badge>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {list.name}
                </h3>
                
                {list.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{list.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {list.area && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{list.area}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <ListChecks className="w-3 h-3" />
                    <span>{list.templates?.length || 0} pasos</span>
                  </div>
                  {list.requireEvidence && (
                    <div className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>Con evidencia</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    {list._count?.assignments || 0} asignaciones
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
