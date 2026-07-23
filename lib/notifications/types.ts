// =====================================================
// CONVERTO — Notification Types & Enums
// =====================================================
// Shared between UserSide and ServerSide.
// Keep this file identical in both projects.
// =====================================================

/**
 * Notification category enum — use instead of raw strings.
 * 
 * @example
 * if (n.category === NotificationCategory.PAYMENT) { ... }
 * filter === NotificationCategory.REQUEST
 */
export const NotificationCategory = {
  SYSTEM: 'system',
  REQUEST: 'request',
  PROMO: 'promo',
  SECURITY: 'security',
  PAYMENT: 'payment',
  CHAT: 'chat',
} as const;

export type NotificationCategoryValue = typeof NotificationCategory[keyof typeof NotificationCategory];

/**
 * Notification priority enum
 */
export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriorityValue = typeof NotificationPriority[keyof typeof NotificationPriority];

/**
 * Core notification shape — matches the `notifications` table in Supabase.
 */
export interface Notification {
  id: string;
  profile_id: string | null;
  target_role: string;
  category: NotificationCategoryValue;
  priority: NotificationPriorityValue;
  channel: string[];
  title: string;
  message: string;
  action_url: string | null;
  entity_type: string | null;
  entity_id: string | null;
  icon: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * Hook configuration
 */
export interface UseNotificationsConfig {
  /** 'user' = see only own + broadcast; 'staff' = see all */
  mode: 'user' | 'staff';
  /** Max notifications to fetch. Default: 50 */
  limit?: number;
}

/**
 * Filter tabs — extensible for future categories
 */
export type NotificationFilter = 'all' | 'unread' | NotificationCategoryValue;

/**
 * Hook return type
 */
export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  filterNotifications: (filter: NotificationFilter) => Notification[];
  refresh: () => Promise<void>;
}
