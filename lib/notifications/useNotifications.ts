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

      // Mode-specific filtering
      if (mode === 'user') {
        // Users see their own + broadcast (profile_id is null)
        query = query.or(`profile_id.eq.${currentUserId},profile_id.is.null`);
      } else if (mode === 'staff') {
        // Staff sees everything (RLS policy handles this, but we don't add extra filters)
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setNotifications((data as Notification[]) || []);

    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [supabase, mode, limit]);

  // 2. Setup Realtime Subscription
  useEffect(() => {
    fetchNotifications();

    if (!userId && mode === 'user') return; // User mode requires userId. Staff mode technically might fetch all even if RLS allows it, but realistically staff is also logged in.

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
              if (newNotif.profile_id !== userId && newNotif.profile_id !== null) {
                return; // Not for this user
              }
            }
            
            setNotifications((prev) => [newNotif, ...prev]);

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
              if (updatedNotif.profile_id !== userId && updatedNotif.profile_id !== null) {
                return;
              }
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
    
    if (mode === 'user' && userId) {
      query = query.eq('profile_id', userId);
    }
    // For staff, markAllAsRead might be tricky if it marks EVERY notification as read for everyone. 
    // Usually, we'd only mark our own. Assuming staff just marks what's visible, or we just execute it.
    // If we only want to mark staff's own read, we should do eq('profile_id', userId).
    // For now, let's keep it scoped to user if mode=user. 
    // If mode=staff, this marks all unread in DB as read. RLS might restrict it to own notifications depending on policy.
    // The policy says: "Users can update own notifications" USING (profile_id = auth.uid())
    // Wait, staff policy for UPDATE doesn't exist? Only for SELECT and INSERT?
    // Let's scope it to profile_id = userId for both to be safe and avoid errors, unless broadcast.
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
