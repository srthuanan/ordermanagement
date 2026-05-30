import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export interface AdminNotification {
  id: string;
  created_at: string;
  type: string;
  message: string;
  link?: string;
  is_read: boolean;
}

export function useNotifications(isAdmin: boolean) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!isAdmin || !supabase) return;
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !supabase) return;

    fetchNotifications();

    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          fetchNotifications();
          
          // Show toast if it's a new insert
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as AdminNotification;
            // Dispatch a custom event to show global toast, handled in App or Header
            window.dispatchEvent(new CustomEvent('new-admin-notification', { detail: newNotif }));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAdmin, fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!supabase) return;
    
    // Cập nhật local ngay lập tức để UI mượt
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);
      
    if (error) {
      console.error('Error marking as read:', error);
      // Khôi phục lại trạng thái nếu lỗi
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      setUnreadCount(prev => prev + 1);
    }
  };

  const markAllAsRead = async () => {
    if (!supabase) return;
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    // Ở đây chỉ cập nhật những cái chưa đọc để giảm tải query
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
}
