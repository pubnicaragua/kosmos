import { prisma } from './prisma'

export type NotificationType = 'ASSIGNMENT' | 'MENTION' | 'REMINDER' | 'STATUS_CHANGE' | 'COMMENT'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    })

    // Emit event for real-time notification (if WebSocket is implemented)
    // For now, notifications will be polled by the frontend
    
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Create assignment notification when a user is assigned to a task/ticket/opportunity
 */
export async function notifyAssignment(params: {
  assignedUserId: string
  assignedByUserId: string
  itemType: 'ticket' | 'activity' | 'opportunity'
  itemTitle: string
  itemId: string
}) {
  const { assignedUserId, assignedByUserId, itemType, itemTitle, itemId } = params

  // Get assigner name
  const assigner = await prisma.user.findUnique({
    where: { id: assignedByUserId },
    select: { name: true },
  })

  const itemTypeLabels = {
    ticket: 'ticket',
    activity: 'actividad',
    opportunity: 'oportunidad',
  }

  const itemLinks = {
    ticket: `/tickets-soporte/${itemId}`,
    activity: `/actividades`,
    opportunity: `/pipeline-ventas`,
  }

  return createNotification({
    userId: assignedUserId,
    type: 'ASSIGNMENT',
    title: `Nueva ${itemTypeLabels[itemType]} asignada`,
    message: `${assigner?.name || 'Alguien'} te ha asignado: ${itemTitle}`,
    link: itemLinks[itemType],
  })
}

/**
 * Get user's unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    })
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string) {
  try {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return null
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  try {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    })
  } catch (error) {
    console.error('Error marking all as read:', error)
    return null
  }
}
