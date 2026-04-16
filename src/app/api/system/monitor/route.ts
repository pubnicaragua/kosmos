import { NextRequest } from 'next/server'
import os from 'os'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { successResponse, errorResponse } from '@/lib/api-response'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SecurityLevel = 'secure' | 'warning' | 'error'

interface ActivityFeedItem {
  timestamp: number
  time: string
  action: string
  status: 'success' | 'warning' | 'error'
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readCpuSample() {
  const snapshot = os.cpus()
  let idle = 0
  let total = 0

  for (const cpu of snapshot) {
    idle += cpu.times.idle
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq
  }

  return { idle, total }
}

async function getCpuUsagePercent(sampleMs = 150): Promise<number> {
  const start = readCpuSample()
  await wait(sampleMs)
  const end = readCpuSample()

  const idleDiff = end.idle - start.idle
  const totalDiff = end.total - start.total

  if (totalDiff <= 0) return 0

  const usage = (1 - idleDiff / totalDiff) * 100
  return Number(Math.max(0, Math.min(100, usage)).toFixed(1))
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.join(' ') || '0s'
}

function envFlag(name: string): boolean {
  const value = process.env[name]
  if (!value) return false
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function buildSecurityStatus(request: NextRequest) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const requestProto = request.nextUrl.protocol.replace(':', '')
  const sslEnabled = (forwardedProto || requestProto) === 'https'

  const jwtSecret = process.env.JWT_SECRET || ''
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || ''
  const usesFallbackSecret =
    jwtSecret === 'fallback-secret' || jwtRefreshSecret === 'fallback-refresh-secret'
  const authConfigured = Boolean(jwtSecret && jwtRefreshSecret) && !usesFallbackSecret

  const firewallEnabled = envFlag('FIREWALL_ENABLED')
  const ddosAtEdge = Boolean(request.headers.get('cf-ray') || request.headers.get('x-vercel-id'))
  const backupConfigured = Boolean(process.env.BACKUP_DIR || process.env.BACKUP_CRON)

  const databaseUrl = process.env.DATABASE_URL || ''
  const encryptedDbConnection =
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('ssl=true') ||
    Boolean(process.env.SUPABASE_URL?.startsWith('https://'))

  const toLevel = (flag: boolean, whenFalse: SecurityLevel = 'warning'): SecurityLevel =>
    flag ? 'secure' : whenFalse

  return {
    ssl: toLevel(sslEnabled),
    auth: toLevel(authConfigured, 'error'),
    firewall: toLevel(firewallEnabled),
    ddos: toLevel(ddosAtEdge),
    backup: toLevel(backupConfigured),
    encryption: toLevel(encryptedDbConnection, 'error'),
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse('Token de autenticación requerido', 401)
    }

    const token = authHeader.substring(7)
    const payload = verifyAccessToken(token)
    if (!payload) {
      return errorResponse('Token inválido o expirado', 401)
    }

    const userCompanies = await prisma.userCompany.findMany({
      where: { userId: payload.userId },
      select: { companyId: true, role: true },
    })

    const isSuperAdmin = userCompanies.some((userCompany) => userCompany.role === 'SUPER_ADMIN')
    let scopedCompanyIds = userCompanies.map((userCompany) => userCompany.companyId)

    if (isSuperAdmin) {
      const allCompanies = await prisma.company.findMany({ select: { id: true } })
      scopedCompanyIds = allCompanies.map((company) => company.id)
    }

    if (scopedCompanyIds.length === 0) {
      return successResponse({
        serverTime: new Date().toLocaleString('es-ES'),
        companies: 0,
        activeCompanies: 0,
        activeSessions: 0,
        uptime: formatUptime(Math.floor(os.uptime())),
        uptimeSeconds: Math.floor(os.uptime()),
        memoryUsage: 0,
        cpuUsage: 0,
        securityStatus: buildSecurityStatus(request),
        recentActivity: [],
      })
    }

    const now = new Date()
    const [companies, activeSessions, loginEvents, activityEvents, notificationEvents, cpuUsage] =
      await Promise.all([
        prisma.company.findMany({
          where: { id: { in: scopedCompanyIds } },
          select: { id: true, isActive: true },
        }),
        prisma.refreshToken.count({
          where: {
            expiresAt: { gt: now },
            user: {
              userCompanies: {
                some: {
                  companyId: { in: scopedCompanyIds },
                },
              },
            },
          },
        }),
        prisma.refreshToken.findMany({
          where: {
            user: {
              userCompanies: {
                some: {
                  companyId: { in: scopedCompanyIds },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.activity.findMany({
          where: { companyId: { in: scopedCompanyIds } },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: {
            title: true,
            status: true,
            updatedAt: true,
          },
        }),
        prisma.notification.findMany({
          where: {
            user: {
              userCompanies: {
                some: {
                  companyId: { in: scopedCompanyIds },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            title: true,
            createdAt: true,
            isRead: true,
          },
        }),
        getCpuUsagePercent(),
      ])

    const memoryUsage = Number(
      (((os.totalmem() - os.freemem()) / Math.max(os.totalmem(), 1)) * 100).toFixed(1)
    )

    // Usar el mayor entre os.uptime y process.uptime para evitar reportes de "0" en contenedores
    const uptimeSeconds = Math.max(Math.floor(os.uptime()), Math.floor(process.uptime()))

    const activityFeed: ActivityFeedItem[] = [
      ...loginEvents.map((event) => ({
        timestamp: event.createdAt.getTime(),
        time: event.createdAt.toLocaleTimeString('es-ES'),
        action: `Inicio de sesión: ${event.user.name || event.user.email}`,
        status: 'success' as const,
      })),
      ...activityEvents.map((event) => ({
        timestamp: event.updatedAt.getTime(),
        time: event.updatedAt.toLocaleTimeString('es-ES'),
        action: `Actividad: ${event.title}`,
        status:
          event.status === 'COMPLETED'
            ? ('success' as const)
            : event.status === 'CANCELLED'
            ? ('error' as const)
            : ('warning' as const),
      })),
      ...notificationEvents.map((event) => ({
        timestamp: event.createdAt.getTime(),
        time: event.createdAt.toLocaleTimeString('es-ES'),
        action: `Notificación: ${event.title}`,
        status: event.isRead ? ('success' as const) : ('warning' as const),
      })),
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)

    return successResponse({
      serverTime: new Date().toLocaleString('es-ES'),
      companies: companies.length,
      activeCompanies: companies.filter((company) => company.isActive).length,
      activeSessions,
      uptime: formatUptime(uptimeSeconds),
      uptimeSeconds,
      memoryUsage,
      cpuUsage,
      securityStatus: buildSecurityStatus(request),
      recentActivity: activityFeed.map(({ time, action, status }) => ({ time, action, status })),
    })
  } catch (error) {
    console.error('System monitor error:', error)
    return errorResponse('Error al obtener métricas del sistema', 500)
  }
}
