'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationCategory, NotificationFilter } from '@/lib/notifications/types';
import { formatRelativeTime, truncateMessage } from '@/lib/notifications/utils';
import Link from 'next/link';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    loading,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearReadNotifications,
    filterNotifications
  } = useNotifications();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredNotifications = filterNotifications(filter);
  
  // Memoize counts for tabs
  const tabCounts = useMemo(() => ({
    all: notifications.length,
    unread: unreadCount,
    chat: notifications.filter(n => n.category === NotificationCategory.CHAT).length,
    request: notifications.filter(n => n.category === NotificationCategory.REQUEST).length,
    payment: notifications.filter(n => n.category === NotificationCategory.PAYMENT).length,
    system: notifications.filter(n => n.category === NotificationCategory.SYSTEM).length,
  }), [notifications, unreadCount]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deletingId === id) {
      await deleteNotification(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      // Reset confirmation after 3 seconds
      setTimeout(() => {
        setDeletingId((current) => current === id ? null : current);
      }, 3000);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 border-2 border-border bg-card hover:bg-accent hover:text-accent-foreground transition-all shadow-[2px_2px_0px_0px_var(--color-border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-border rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[340px] md:w-[420px] bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--color-border)] z-50 flex flex-col max-h-[600px]">
          
          {/* Header */}
          <div className="p-4 border-b-4 border-border bg-accent font-black uppercase text-sm flex justify-between items-center text-accent-foreground">
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notifications
            </span>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin opacity-50" />
            ) : (
              <div className="flex gap-2 items-center">
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 border-2 border-border">{unreadCount} New</span>
                )}
              </div>
            )}
          </div>
          
          {/* Tabs */}
          <div className="flex border-b-4 border-border overflow-x-auto scrollbar-hide text-[9px] md:text-[10px] uppercase font-black bg-background">
            <button onClick={() => setFilter('all')} className={cn("px-3 md:px-4 py-2 md:py-3 shrink-0 border-r-4 border-border transition-colors", filter === 'all' ? "bg-foreground text-background" : "hover:bg-accent")}>
              All ({tabCounts.all})
            </button>
            <button onClick={() => setFilter('unread')} className={cn("px-3 md:px-4 py-2 md:py-3 shrink-0 border-r-4 border-border transition-colors", filter === 'unread' ? "bg-foreground text-background" : "hover:bg-accent")}>
              Unread ({tabCounts.unread})
            </button>
            <button onClick={() => setFilter(NotificationCategory.CHAT as NotificationFilter)} className={cn("px-3 md:px-4 py-2 md:py-3 shrink-0 border-r-4 border-border transition-colors", filter === NotificationCategory.CHAT ? "bg-foreground text-background" : "hover:bg-accent")}>
              Chat ({tabCounts.chat})
            </button>
            <button onClick={() => setFilter(NotificationCategory.REQUEST as NotificationFilter)} className={cn("px-3 md:px-4 py-2 md:py-3 shrink-0 border-r-4 border-border transition-colors", filter === NotificationCategory.REQUEST ? "bg-foreground text-background" : "hover:bg-accent")}>
              Requests ({tabCounts.request})
            </button>
            <button onClick={() => setFilter(NotificationCategory.PAYMENT as NotificationFilter)} className={cn("px-3 md:px-4 py-2 md:py-3 shrink-0 border-r-4 border-border transition-colors", filter === NotificationCategory.PAYMENT ? "bg-foreground text-background" : "hover:bg-accent")}>
              Payments ({tabCounts.payment})
            </button>
            <button onClick={() => setFilter(NotificationCategory.SYSTEM as NotificationFilter)} className={cn("px-3 md:px-4 py-2 md:py-3 shrink-0 transition-colors", filter === NotificationCategory.SYSTEM ? "bg-foreground text-background" : "hover:bg-accent")}>
              System ({tabCounts.system})
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 bg-background min-h-[250px]">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center opacity-50 h-[250px]">
                 <Loader2 className="w-8 h-8 animate-spin mb-3" />
                 <span className="text-sm font-black uppercase">Loading...</span>
              </div>
            ) : filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => {
                const isUnread = !notification.is_read;
                const ContentWrapper = notification.action_url ? Link : 'div';
                
                return (
                  <div key={notification.id} className="relative group border-b-4 border-border last:border-b-0 flex">
                    <ContentWrapper 
                      href={notification.action_url || '#'}
                      onClick={() => { if (isUnread) markAsRead(notification.id); setIsOpen(false); }}
                      className={cn("p-4 flex-1 cursor-pointer transition-colors block", isUnread ? "bg-accent/30" : "hover:bg-accent/10")}
                    >
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="font-black text-sm uppercase leading-tight pr-8">
                          {notification.title}
                        </span>
                        <span className="text-[10px] opacity-60 font-bold shrink-0 uppercase tracking-widest">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                      <div className="text-xs font-bold opacity-80 mt-1">
                        {truncateMessage(notification.message)}
                      </div>
                    </ContentWrapper>
                    
                    {/* Delete Action */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-end">
                       <button 
                         onClick={(e) => handleDelete(e, notification.id)}
                         className={cn(
                           "transition-all p-2 border-2 border-border bg-card text-xs font-black shadow-[2px_2px_0px_0px_var(--color-border)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
                           deletingId === notification.id 
                             ? "bg-red-500 text-white opacity-100" 
                             : "opacity-0 group-hover:opacity-100 hover:bg-red-100 text-foreground"
                         )}
                         title={deletingId === notification.id ? "Click to confirm delete" : "Delete notification"}
                       >
                         {deletingId === notification.id ? "Delete?" : <Trash2 className="w-4 h-4" />}
                       </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center opacity-60 h-[250px]">
                <Bell className="w-10 h-10 mb-4 opacity-50" />
                <div className="text-sm font-black uppercase tracking-widest">No notifications yet</div>
                <div className="text-xs font-bold mt-2">You're all caught up.</div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="border-t-4 border-border bg-card p-3 flex flex-wrap gap-2 justify-between items-center text-xs uppercase font-black">
               <button 
                 onClick={markAllAsRead} 
                 disabled={unreadCount === 0}
                 className="flex items-center gap-2 p-2 border-2 border-transparent hover:border-border hover:bg-accent transition-all disabled:opacity-50 disabled:hover:border-transparent disabled:hover:bg-transparent"
               >
                 <Check className="w-4 h-4" /> Mark all read
               </button>
               <button 
                 onClick={clearReadNotifications}
                 className="flex items-center gap-2 p-2 border-2 border-transparent hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all"
               >
                 <Trash2 className="w-4 h-4" /> Clear read
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
