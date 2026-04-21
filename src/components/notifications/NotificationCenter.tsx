'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui-kit/Button'
import { Badge } from '@/components/ui-kit/Badge'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  createdAt: string
  link?: string
  dbId?: string
}

type NotificationPayload = Omit<Notification, 'id' | 'createdAt' | 'read'>

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const seenDbIdsRef = useRef<Set<string>>(new Set())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const emitFallbackTone = () => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = 880
      gain.gain.value = 0.04
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.12)
    } catch {
      // no-op
    }
  }

  const pollNotifications = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    try {
      const res = await fetch('/api/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const dbNotifs: any[] = data.data?.notifications || []
      const dbUnreadCount: number = data.data?.unreadCount ?? 0

      // Always use DB unread count as source of truth for badge
      setUnreadCount(dbUnreadCount)

      // Build full notification list from DB (replace local state with DB truth)
      const mapped: Notification[] = dbNotifs.map((n: any) => ({
        id: `db-${n.id}`,
        dbId: n.id,
        title: n.title,
        message: n.message,
        type: n.type === 'ASSIGNMENT' ? 'info' : n.type === 'STATUS_CHANGE' ? 'success' : 'info',
        read: n.isRead,
        createdAt: n.createdAt,
        link: n.link || undefined,
      }))

      setNotifications((prev) => {
        // Find truly new unread ones (not seen before)
        const freshUnread = mapped.filter(
          (n) => !seenDbIdsRef.current.has(n.dbId!) && !n.read
        )
        // Register all as seen
        mapped.forEach((n) => { if (n.dbId) seenDbIdsRef.current.add(n.dbId) })
        // Play sound for new unread arrivals
        if (freshUnread.length > 0) {
          playNotificationSound()
          freshUnread.forEach((n) =>
            showBrowserNotification(n.title, n.message)
          )
        }
        return mapped
      })
    } catch {
      // silently fail
    }
  }

  const connectWebSocket = () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/notifications/ws?token=${token}`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected for notifications')
        pollNotifications() // Initial load
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'notification') {
            const newNotif: Notification = {
              id: `db-${data.notification.id}`,
              dbId: data.notification.id,
              title: data.notification.title,
              message: data.notification.message,
              type: data.notification.type === 'ASSIGNMENT' ? 'info' : 'success',
              read: false,
              createdAt: data.notification.createdAt,
              link: data.notification.link || undefined,
            }
            
            if (!seenDbIdsRef.current.has(newNotif.dbId!)) {
              seenDbIdsRef.current.add(newNotif.dbId!)
              setNotifications(prev => [newNotif, ...prev])
              setUnreadCount(prev => prev + 1)
              playNotificationSound()
              showBrowserNotification(newNotif.title, newNotif.message)
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket closed, reconnecting in 5s...')
        wsRef.current = null
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000)
      }
    } catch (err) {
      console.error('Failed to connect WebSocket:', err)
      // Fallback to polling
      pollIntervalRef.current = setInterval(pollNotifications, 15000)
    }
  }

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio('/notification-sound.mp3')
    audioRef.current.volume = 0.5

    // Load notifications from localStorage as seed
    const stored = localStorage.getItem('notifications')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
        parsed.forEach((n: Notification) => { if (n.dbId) seenDbIdsRef.current.add(n.dbId) })
      } catch { /* ignore */ }
    }

    // Try WebSocket first, fallback to polling
    connectWebSocket()
    
    // Backup polling every 30s in case WebSocket fails
    pollIntervalRef.current = setInterval(pollNotifications, 30000)

    return () => {
      if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (reminderIntervalRef.current) {
      clearInterval(reminderIntervalRef.current)
    }

    reminderIntervalRef.current = setInterval(() => {
      const unread = notifications.filter((n) => !n.read)
      if (unread.length > 0) {
        playNotificationSound()
        showBrowserNotification(
          'Recordatorio de Notificaciones',
          `Tienes ${unread.length} notificación(es) pendiente(s)`
        )
      }
    }, 20 * 60 * 1000)

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current)
      }
    }
  }, [notifications])

  useEffect(() => {
    // Persist to localStorage but do NOT override DB-sourced unreadCount
    localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [notifications])

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => emitFallbackTone())
    } else {
      emitFallbackTone()
    }
  }

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png' })
    }
  }

  const addNotification = (notification: NotificationPayload) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      read: false,
    }

    setNotifications(prev => [newNotification, ...prev])
    playNotificationSound()
    showBrowserNotification(notification.title, notification.message)
  }

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<NotificationPayload>
      if (!customEvent.detail?.title || !customEvent.detail?.message) return
      addNotification(customEvent.detail)
    }

    window.addEventListener('add-notification', handler as EventListener)
    return () => window.removeEventListener('add-notification', handler as EventListener)
  }, [])

  const markAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      const target = prev.find((n) => n.id === id)
      if (target?.dbId) {
        const token = localStorage.getItem('accessToken')
        if (token) {
          fetch('/api/notifications', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationId: target.dbId }),
          }).catch(() => {})
        }
      }
      return updated
    })
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const token = localStorage.getItem('accessToken')
    if (token) {
      fetch('/api/notifications', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      }).catch(() => {})
    }
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button size="sm" variant="outline" onClick={markAllAsRead}>
                    Marcar todas como leídas
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={clearAll}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>No tienes notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <Badge variant="default" className="flex-shrink-0">Nuevo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleString('es-ES')}
                            </span>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-primary hover:text-primary-dark"
                                >
                                  Marcar como leída
                                </button>
                              )}
                              {notification.link && (
                                <a
                                  href={notification.link}
                                  className="text-xs text-primary hover:text-primary-dark"
                                  onClick={() => {
                                    markAsRead(notification.id)
                                    setIsOpen(false)
                                  }}
                                >
                                  Ver detalles
                                </a>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Export function to add notifications from anywhere in the app
export const useNotifications = () => {
  const addNotification = (notification: NotificationPayload) => {
    const event = new CustomEvent('add-notification', { detail: notification })
    window.dispatchEvent(event)
  }

  return { addNotification }
}
