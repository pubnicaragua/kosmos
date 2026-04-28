'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ShoppingCart, Plus, Filter, Search, MoreVertical, 
  Clock, CheckCircle2, XCircle, Package, Truck, 
  AlertTriangle, TrendingUp, BarChart3, ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui-kit/Button'
import { Card } from '@/components/ui-kit/Card'
import { Badge } from '@/components/ui-kit/Badge'
import { Input } from '@/components/ui-kit/Input'
import Link from 'next/link'
import { useCompany } from '@/hooks/useCompany'

const STATUS_CONFIG = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  APROBADA: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  COMPRADO: { label: 'Comprado', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: Package },
  RECIBIDO: { label: 'Recibido', color: 'bg-green-100 text-green-700 border-green-200', icon: Truck },
}

export default function SolicitudesCompraPage() {
  const { selectedCompany } = useCompany()
  const [requests, setRequests] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token || !selectedCompany || selectedCompany === 'all') return

    try {
      setIsLoading(true)
      const [reqsRes, statsRes, kpisRes] = await Promise.all([
        fetch(`/api/purchase-requests?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/purchase-requests/stats?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/purchase-requests/kpis?companyId=${selectedCompany}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      
      const reqsData = await reqsRes.json()
      const statsData = await statsRes.json()
      const kpisData = await kpisRes.json()
      
      if (reqsData.success) setRequests(reqsData.data)
      if (statsData.success) setStats(statsData.data)
      if (kpisData.success) setKpis(kpisData.data)
    } catch (err) {
      console.error('Error loading purchase requests:', err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredRequests = requests.filter(r => 
    r.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.requestingArea.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const KanbanColumn = ({ status, items }: { status: keyof typeof STATUS_CONFIG, items: any[] }) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    return (
      <div className="flex-shrink-0 w-[280px] md:w-[320px] bg-slate-50/50 rounded-2xl p-3 md:p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${config.color.split(' ')[0]} bg-opacity-20`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">{config.label}</h3>
            <span className="bg-white px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-400 border border-slate-100 shadow-sm">
              {items.length}
            </span>
          </div>
        </div>
        
        <div className="space-y-3">
          {items.map(req => (
            <Link key={req.id} href={`/solicitudes-compra/${req.id}`}>
              <Card className="p-4 hover:shadow-xl transition-all duration-300 group cursor-pointer border-slate-100 hover:border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-widest">{req.requestNumber}</span>
                  <div className={`px-2 py-0.5 rounded-full border text-[9px] uppercase font-black tracking-tighter ${
                    req.priority === 'ALTA' ? 'border-red-500 text-red-600' :
                    req.priority === 'MEDIA' ? 'border-blue-500 text-blue-600' :
                    'border-slate-300 text-slate-500'
                  }`}>
                    {req.priority}
                  </div>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1 line-clamp-1">{req.requestingArea}</h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(req.requestDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex -space-x-2">
                    {/* Placeholder for requestor avatar */}
                    <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                      ?
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Detalles <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
          {items.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <span className="text-xs text-slate-400 font-medium italic">Sin solicitudes</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header section with Stats */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Solicitudes de Compra</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Gestión estratégica de suministros y reposición de inventario.</p>
          </div>
          <Link href="/solicitudes-compra/nueva">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl font-bold gap-2">
              <Plus className="w-5 h-5" />
              NUEVA SOLICITUD
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 bg-gradient-to-br from-white to-slate-50 border-slate-100 hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Bajo</p>
                <h3 className="text-2xl font-black text-slate-900">{stats?.metrics?.lowStock || 0}</h3>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-white to-slate-50 border-slate-100 hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
                <h3 className="text-2xl font-black text-slate-900">{stats?.metrics?.activeRequests || 0}</h3>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-white to-slate-50 border-slate-100 hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin Rotación</p>
                <h3 className="text-2xl font-black text-slate-900">{stats?.metrics?.noRotation90 || 0}</h3>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-gradient-to-br from-white to-slate-50 border-slate-100 hover:shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recibido (Mes)</p>
                <h3 className="text-2xl font-black text-slate-900 font-bold">
                  {requests.filter(r => r.status === 'RECIBIDO').length}
                </h3>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main content with Kanban/List switcher */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar por código o área..." 
              className="pl-10 border-none bg-slate-50 hover:bg-slate-100 focus:bg-white transition-all rounded-xl h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <Button 
              variant={view === 'kanban' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('kanban')}
              className={`rounded-lg h-9 font-bold text-[11px] uppercase tracking-wider ${view === 'kanban' ? 'bg-white shadow-sm' : ''}`}
            >
              KANBAN
            </Button>
            <Button 
              variant={view === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setView('list')}
              className={`rounded-lg h-9 font-bold text-[11px] uppercase tracking-wider ${view === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              LISTA
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-96 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide min-h-[400px] max-w-full">
            {Object.keys(STATUS_CONFIG).map((status) => (
              <KanbanColumn 
                key={status} 
                status={status as keyof typeof STATUS_CONFIG} 
                items={filteredRequests.filter(r => r.status === status)}
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Código</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Área</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Prioridad</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest">Fecha</th>
                  <th className="px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      <Link href={`/solicitudes-compra/${req.id}`}>
                        {req.requestNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{req.requestingArea}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-block px-2 py-0.5 rounded-full border text-[9px] uppercase font-black ${
                        req.priority === 'ALTA' ? 'border-red-500 text-red-600' :
                        req.priority === 'MEDIA' ? 'border-blue-500 text-blue-600' :
                        'border-slate-300 text-slate-500'
                      }`}>
                        {req.priority}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG].color} border-none font-bold text-[10px]`}>
                        {STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG].label}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{new Date(req.requestDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" className="group-hover:bg-white rounded-lg transition-all p-2">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* KPI Indicators Section */}
      {kpis && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Indicadores y Métricas Clave</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-slate-100 hover:shadow-lg transition-all bg-gradient-to-br from-red-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-red-400 uppercase tracking-widest">Stock Bajo</p>
                  <p className="text-3xl font-black text-red-600">{kpis.lowStockCount || 0}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">Productos bajo stock mínimo</p>
            </Card>
            <Card className="p-6 border-slate-100 hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Top Vendidos</p>
                  <p className="text-3xl font-black text-blue-600">{kpis.topProducts?.length || 0}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">Productos más vendidos del mes</p>
            </Card>
            <Card className="p-6 border-slate-100 hover:shadow-lg transition-all bg-gradient-to-br from-amber-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest">Sin Rotación</p>
                  <p className="text-3xl font-black text-amber-600">{kpis.noRotationCount || 0}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">Productos sin venta en 90 días</p>
            </Card>
            <Card className="p-6 border-slate-100 hover:shadow-lg transition-all bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-black text-green-400 uppercase tracking-widest">Tiempo Reposición</p>
                  <p className="text-3xl font-black text-green-600">{kpis.avgReplenishmentDays || 0}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">Días promedio de reposición</p>
            </Card>
          </div>
        </div>
      )}

      {/* Top Products Section */}
      {kpis?.topProducts?.length > 0 && (
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Top 20 Productos Más Vendidos</h2>
            <div className="h-px flex-1 bg-slate-100" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.topProducts.slice(0, 20).map((p: any, i: number) => (
              <Card key={i} className="p-5 border-slate-100 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">{p.name}</h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.sku}</span>
                  </div>
                  <div className="bg-blue-50 px-2 py-1 rounded-lg">
                    <span className="text-blue-700 font-black text-xs">#{i + 1}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 text-[11px]">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-tighter">Vendido</p>
                    <p className="text-slate-900 font-black text-base">{p.totalSold} <span className="text-[9px] text-slate-400">uds</span></p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-slate-400 font-bold uppercase tracking-tighter">Rentabilidad</p>
                    <p className="text-green-600 font-black text-base">+{Math.round((p.profit / p.revenue) * 100)}%</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
