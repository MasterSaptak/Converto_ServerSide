import { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationCategory, NotificationPriority } from '@/types/database';

type NotificationInsert = {
  profile_id?: string | null;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  action_url?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  icon?: string | null;
  metadata?: Record<string, any>;
};

export class NotificationService {
  private supabase: SupabaseClient<any>;

  constructor(supabase: SupabaseClient<any>) {
    this.supabase = supabase;
  }

  /**
   * Base method to insert a notification
   */
  async notify(payload: NotificationInsert) {
    const { error } = await this.supabase
      .from('notifications')
      .insert([
        {
          ...payload,
          priority: payload.priority || 'normal',
          channel: ['in_app']
        }
      ] as any);

    if (error) {
      console.error('Failed to insert notification:', error);
      throw error;
    }
  }

  /**
   * Notify a specific user
   */
  async notifyUser(profileId: string, payload: Omit<NotificationInsert, 'profile_id'>) {
    return this.notify({ ...payload, profile_id: profileId });
  }

  /**
   * Broadcast a notification to everyone
   */
  async notifyBroadcast(payload: Omit<NotificationInsert, 'profile_id'>) {
    return this.notify({ ...payload, profile_id: null });
  }

  /**
   * Request Status Update Template
   */
  async notifyRequestUpdate(profileId: string, requestId: string, newStatus: string) {
    return this.notifyUser(profileId, {
      category: 'request',
      title: `Request Status Updated`,
      message: `Your request has been updated to: ${newStatus}`,
      action_url: `/track`,
      entity_type: 'request',
      entity_id: requestId,
      icon: 'refresh-cw'
    });
  }

  /**
   * Quote Template
   */
  async notifyQuote(profileId: string, requestId: string, amount: number, currency: string) {
    return this.notifyUser(profileId, {
      category: 'system', // or add a 'quote' category
      title: `New Quote Ready`,
      message: `A quote of ${amount} ${currency} is ready for your approval.`,
      action_url: `/track`,
      entity_type: 'quote',
      entity_id: requestId,
      icon: 'file-text',
      metadata: { amount, currency }
    });
  }

  /**
   * Wallet Credited Template
   */
  async notifyWalletCredit(profileId: string, transactionId: string, amount: number, currency: string) {
    return this.notifyUser(profileId, {
      category: 'payment',
      title: 'Wallet Credited',
      message: `Your wallet has been credited with ${amount} ${currency}.`,
      action_url: `/wallet`,
      entity_type: 'wallet_transaction',
      entity_id: transactionId,
      icon: 'arrow-down-to-line',
      metadata: { amount, currency, type: 'credit' }
    });
  }

  /**
   * Payment Received Template
   */
  async notifyPaymentReceived(profileId: string, paymentId: string, amount: number, currency: string) {
    return this.notifyUser(profileId, {
      category: 'payment',
      title: 'Payment Received',
      message: `We received your payment of ${amount} ${currency}.`,
      action_url: `/history`,
      entity_type: 'payment',
      entity_id: paymentId,
      icon: 'check-circle',
      metadata: { amount, currency }
    });
  }
}
