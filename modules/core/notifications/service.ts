// =====================================================
// CONVERTO PLATFORM — Core Notification Engine
// =====================================================

import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types/database'

export class NotificationService {
  /**
   * Send a notification to a specific user profile
   */
  static async sendNotification(data: {
    profile_id: string;
    type: 'system' | 'order' | 'payment' | 'message';
    title: string;
    message: string;
    link?: string;
  }): Promise<Notification> {
    const supabase = await createClient()

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...data,
        is_read: false,
        status: 'pending' // Added in v5 migration
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to send notification: ${error.message}`)
    return notification as Notification
  }

  /**
   * Send a status update notification to a customer
   */
  static async sendOrderStatusNotification(
    orderId: string, 
    customerId: string, 
    newStatus: string
  ): Promise<Notification> {
    return this.sendNotification({
      profile_id: customerId,
      type: 'order',
      title: 'Order Status Updated',
      message: `Your order #${orderId.substring(0, 8)} has been updated to ${newStatus}.`,
      link: `/track-order?id=${orderId}`
    })
  }
}
