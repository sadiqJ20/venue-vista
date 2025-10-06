import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    // Fetch existing notifications
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const notificationChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.user_id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Prevent duplicate notifications by checking if we already have this notification
          setNotifications(prev => {
            // Check if notification already exists (by ID or by content + timestamp)
            const exists = prev.some(n => 
              n.id === newNotification.id || 
              (n.title === newNotification.title && 
               n.message === newNotification.message && 
               n.type === newNotification.type &&
               n.data?.booking_id === newNotification.data?.booking_id &&
               Math.abs(new Date(n.created_at).getTime() - new Date(newNotification.created_at).getTime()) < 10000) // Within 10 seconds
            );
            
            if (exists) {
              console.log('Duplicate notification prevented in frontend:', newNotification);
              return prev; // Don't add duplicate
            }
            
            // Show toast notification with appropriate variant
            const getToastVariant = (type: string) => {
              switch (type) {
                case 'booking_rejected':
                  return "destructive";
                case 'booking_approved':
                  return "default";
                case 'new_booking_request':
                case 'approval_required':
                  return "default";
                case 'hall_changed':
                  return "default";
                default:
                  return "default";
              }
            };
            
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: getToastVariant(newNotification.type)
            });
            
            // Add to notifications list and update unread count
            setUnreadCount(prevCount => prevCount + 1);
            return [newNotification, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [profile, toast]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_hod': return 'pending HOD approval';
      case 'pending_principal': return 'pending Principal approval';
      case 'pending_pro': return 'pending PRO approval';
      case 'approved': return 'approved';
      case 'rejected': return 'rejected';
      default: return status;
    }
  };

  const fetchNotifications = async () => {
    if (!profile?.user_id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.user_id) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.user_id)
      .eq('read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
};