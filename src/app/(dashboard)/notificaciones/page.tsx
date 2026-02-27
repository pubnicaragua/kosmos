'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCheck, Clock, Ticket, Clipboard, TrendingUp, User, RefreshCw, Activity } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

interface UserStat {
  user: { id: string; name: string; email: string; avatar: string | null }
  stats: {
    ticketsCreated: number
    activitiesCreated: number
    opportunitiesCreated: number
    ticketsAssigned: number
    activitiesAssigned: number
    total: number
  }
  lastActive: string | null
  recentItems: {
    ticket: { title: string; status: string; createdAt: string } | null
    activity: { title: string; type: string; createdAt: string } | null
    opportunity: { title: string; stage: string; createdAt: string } | null
  }
}

interface FeedItem {
  id: string
  type: 'ticket' | 'activity' | 'opportunity'
  title: string
  status: string
  company: string
  createdAt: string
  user: { id: string; name: string; avatar: string | null }
}

const TYPE_ICON: Record<string, any> = {
  ticket: Ticket,
  activity: Clipboard,
  opportunity: TrendingUp,
  ASSIGNMENT: Bell,
  MENTION: Bell,
  REMINDER: Clock,
  STATUS_CHANGE: Activity,
  COMMENT: Bell,
}

const TYPE_COLOR: Record<string, string> = {
  ticket: 'bg-red-100 text-red-700',
  activity: 'bg-blue-100 text-blue-700',
  opportunity: 'bg-green-100 text-green-700',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function UserAvatar({ user, size = 8 }: { user: { name: string; avatar: string | null }; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm`
  return (
    <div className={cls}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span>{user.name?.charAt(0).toUpperCase() || 'U'}</span>
      )}
    </div>
  )
}

export default function NotificacionesPage() {
  const [tab, setTab] = useState<'mis' | 'admin'>('mis')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [userStats, setUserStats] = useState<UserStat[]>([])
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [days, setDays] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('all')

  const fetchMyNotifications = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setNotifications(data.data.notifications || [])
        setUnreadCount(data.data.unreadCount || 0)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchAdminFeed = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/notifications/admin-feed?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setUserStats(data.data.userStats || [])
        setFeed(data.data.feed || [])
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch { /* ignore */ } finally {
      setIsLoading(false)
    }
  }, [days])

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setIsLoading(true)
    fetchMyNotifications().finally(() => setIsLoading(false))
    fetchAdminFeed()
  }, [fetchMyNotifications, fetchAdminFeed])

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchMyNotifications, 30000)
    return () => clearInterval(iv)
  }, [fetchMyNotifications])

  const markAllRead = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setIsMarkingAll(true)
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* ignore */ } finally {
      setIsMarkingAll(false)
    }
  }

  const markOneRead = async (id: string) => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const filteredFeed = selectedUser === 'all' ? feed : feed.filter((f) => f.user.id === selectedUser)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notificaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">Centro de notificaciones y seguimiento de actividad</p>
        </div>
        <button
          onClick={() => { fetchMyNotifications(); fetchAdminFeed() }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('mis')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'mis' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Mis notificaciones
          {unreadCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">{unreadCount}</span>
          )}
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('admin')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === 'admin' ? 'bg-white shadow text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Actividad del equipo
          </button>
        )}
      </div>

      {/* MY NOTIFICATIONS TAB */}
      {tab === 'mis' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">
              {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={isMarkingAll}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todo como leído
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Sin notificaciones</p>
              <p className="text-gray-400 text-sm mt-1">Cuando te asignen tareas aparecerán aquí</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] || Bell
                return (
                  <li
                    key={n.id}
                    onClick={() => { if (!n.isRead) markOneRead(n.id) }}
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className={`mt-0.5 p-2 rounded-lg ${!n.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      {n.link && (
                        <a
                          href={n.link}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                          Ver detalle →
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* ADMIN ACTIVITY TAB */}
      {tab === 'admin' && isAdmin && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">Período:</span>
            {[7, 15, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${days === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                {d} días
              </button>
            ))}
          </div>

          {/* User stats cards */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Resumen por usuario</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userStats.map(({ user, stats, lastActive }) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(selectedUser === user.id ? 'all' : user.id)}
                    className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedUser === user.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar user={user} size={9} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <span className={`ml-auto text-sm font-bold px-2 py-0.5 rounded-full ${stats.total > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {stats.total}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-red-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-red-700">{stats.ticketsCreated}</p>
                        <p className="text-xs text-red-500">Tickets</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-blue-700">{stats.activitiesCreated}</p>
                        <p className="text-xs text-blue-500">Actividades</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-green-700">{stats.opportunitiesCreated}</p>
                        <p className="text-xs text-green-500">Oportunidades</p>
                      </div>
                    </div>
                    {lastActive && (
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Último acceso: {timeAgo(lastActive)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">
                Feed de actividad
                {selectedUser !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    — {userStats.find(u => u.user.id === selectedUser)?.user.name}
                    <button onClick={() => setSelectedUser('all')} className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
                  </span>
                )}
              </h2>
              <span className="text-sm text-gray-400">{filteredFeed.length} registros</span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : filteredFeed.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Sin actividad en este período</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <ul className="divide-y divide-gray-50">
                  {filteredFeed.map((item) => {
                    const Icon = TYPE_ICON[item.type] || Activity
                    const colorClass = TYPE_COLOR[item.type] || 'bg-gray-100 text-gray-600'
                    return (
                      <li key={`${item.type}-${item.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {item.company} · <span className="capitalize">{item.type}</span> · {item.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <UserAvatar user={item.user} size={7} />
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-medium text-gray-700">{item.user.name}</p>
                            <p className="text-xs text-gray-400">{timeAgo(item.createdAt)}</p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
