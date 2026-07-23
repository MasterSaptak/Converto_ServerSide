// =====================================================
// CONVERTO — Shared Notification Hook
// =====================================================
// Shared between UserSide and ServerSide.
// Keep this file identical in both projects.
// =====================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  Notification, 
  UseNotificationsConfig, 
  UseNotificationsReturn, 
  NotificationFilter 
} from './types';

export function useSharedNotifications(
  supabase: SupabaseClient<any>,
  config: UseNotificationsConfig
): UseNotificationsReturn {
  const { mode, limit = 50 } = config;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Prevent duplicate toasts on realtime reconnects
  const shownToasts = useRef(new Set<string>());

  // 1. Fetch initial data
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user robustly without throwing if no session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session?.user) {
        setUserId(null);
        setNotifications([]);
        setLoading(false);
        return;
      }
      
      const currentUserId = session.user.id;
      setUserId(currentUserId);

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Mode-specific filtering matching RLS policy
      if (mode === 'user') {
        query = query.or(`profile_id.eq.${currentUserId},and(profile_id.is.null,target_role.in.(customer,all))`);
      } else if (mode === 'staff') {
        query = query.or(`profile_id.eq.${currentUserId},and(profile_id.is.null,target_role.in.(staff,all))`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setNotifications((data as Notification[]) || []);

    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [supabase, mode, limit]);

  // 2. Setup Realtime Subscription
  useEffect(() => {
    fetchNotifications();

    if (!userId && mode === 'user') return;

    // Unique channel name to avoid conflicts
    const channelName = `public:notifications-${mode}-${Math.random().toString(36).substring(7)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification;
            
            // Mode-specific realtime filtering
            if (mode === 'user') {
              if (newNotif.target_role === 'staff') return; // Ignore staff notifications
              if (newNotif.profile_id !== userId && newNotif.profile_id !== null) {
                return; // Not for this user
              }
            } else if (mode === 'staff') {
              if (newNotif.target_role === 'customer') return; // Ignore customer notifications
              if (newNotif.profile_id && newNotif.profile_id !== userId) {
                return; // Targeted to another specific staff member
              }
            }
            
            setNotifications((prev) => {
              if (prev.some(n => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });

            // Show toast only once
            if (!shownToasts.current.has(newNotif.id)) {
              shownToasts.current.add(newNotif.id);
              toast(newNotif.title, {
                description: newNotif.message,
                action: newNotif.action_url ? {
                  label: 'View',
                  onClick: () => window.location.href = newNotif.action_url!
                } : undefined,
              });
            }
          }

          if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification;
            
            if (mode === 'user') {
              if (updatedNotif.target_role === 'staff') return;
              if (updatedNotif.profile_id !== userId && updatedNotif.profile_id !== null) {
                return;
              }
            } else if (mode === 'staff') {
              if (updatedNotif.target_role === 'customer') return;
            }

            setNotifications((prev) => 
              prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
            );
          }

          if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn(`Notification channel (${mode}) disconnected:`, status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, mode, userId, fetchNotifications]);

  // 3. Actions (Optimistic Updates + Supabase call)
  
  const markAsRead = async (id: string) => {
    setNotifications((prev) => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark as read:', error);
      fetchNotifications(); // revert
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map(n => ({ ...n, is_read: true })));

    let query = supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
    
    if (userId) {
      query = query.eq('profile_id', userId); 
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to mark all as read:', error);
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete notification:', error);
      fetchNotifications();
    }
  };

  const clearReadNotifications = async () => {
    setNotifications((prev) => prev.filter(n => !n.is_read));

    let query = supabase.from('notifications').delete().eq('is_read', true);
    if (userId) {
      query = query.eq('profile_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to clear read notifications:', error);
      fetchNotifications();
    }
  };

  // 4. Memoized derived state
  
  // Sort by created_at desc
  const sortedNotifications = useMemo(() => {
    return [...notifications].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return sortedNotifications.reduce((count, n) => count + (n.is_read ? 0 : 1), 0);
  }, [sortedNotifications]);

  const filterNotifications = useCallback((filter: NotificationFilter) => {
    if (filter === 'all') return sortedNotifications;
    if (filter === 'unread') return sortedNotifications.filter(n => !n.is_read);
    return sortedNotifications.filter(n => n.category === filter);
  }, [sortedNotifications]);

  return {
    notifications: sortedNotifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    filterNotifications,
    refresh: fetchNotifications,
  };
}
