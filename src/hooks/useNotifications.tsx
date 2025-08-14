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
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'booking_rejected' ? "destructive" : "default"
          });
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    // Set up real-time subscription for bookings based on user role (legacy support)
    let channel: any;

    if (profile.role === 'faculty') {
      // Faculty gets notified when their bookings change status
      channel = supabase
        .channel('faculty-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: `faculty_id=eq.${profile.id}`
          },
          (payload) => {
            const newBooking = payload.new as any;
            const oldBooking = payload.old as any;
            
            if (newBooking.status !== oldBooking.status) {
              let message = '';
              let type: 'booking_approved' | 'booking_rejected' = 'booking_approved';
              
              if (newBooking.status === 'approved') {
                message = `Your booking for "${newBooking.event_name}" has been approved!`;
                type = 'booking_approved';
              } else if (newBooking.status === 'rejected') {
                message = `Your booking for "${newBooking.event_name}" has been rejected.`;
                type = 'booking_rejected';
              } else {
                const statusText = getStatusText(newBooking.status);
                message = `Your booking for "${newBooking.event_name}" is now ${statusText}`;
              }

              toast({
                title: "Booking Update",
                description: message,
                variant: newBooking.status === 'rejected' ? "destructive" : "default"
              });

              // Add to notifications list
              const notification: Notification = {
                id: Date.now().toString(),
                title: "Booking Update",
                message,
                type,
                created_at: new Date().toISOString(),
                read: false
              };
              
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .subscribe();
    } else if (profile.role === 'hod') {
      // HOD gets notified of new bookings in their department
      channel = supabase
        .channel('hod-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings',
            filter: `department=eq.${profile.department}`
          },
          (payload) => {
            const newBooking = payload.new as any;
            const message = `New booking request from ${newBooking.faculty_name} for "${newBooking.event_name}"`;
            
            toast({
              title: "New Booking Request",
              description: message,
              variant: "default"
            });

            const notification: Notification = {
              id: Date.now().toString(),
              title: "New Booking Request",
              message,
              type: 'new_booking',
              created_at: new Date().toISOString(),
              read: false
            };
            
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();
    } else if (profile.role === 'principal') {
      // Principal gets notified of bookings pending their approval
      channel = supabase
        .channel('principal-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: 'status=eq.pending_principal'
          },
          (payload) => {
            const newBooking = payload.new as any;
            const oldBooking = payload.old as any;
            
            if (newBooking.status === 'pending_principal' && oldBooking.status !== 'pending_principal') {
              const message = `Booking request for "${newBooking.event_name}" requires your approval`;
              
              toast({
                title: "Approval Required",
                description: message,
                variant: "default"
              });

              const notification: Notification = {
                id: Date.now().toString(),
                title: "Approval Required",
                message,
                type: 'new_booking',
                created_at: new Date().toISOString(),
                read: false
              };
              
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .subscribe();
    } else if (profile.role === 'pro') {
      // PRO gets notified of bookings pending their final approval
      channel = supabase
        .channel('pro-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'bookings',
            filter: 'status=eq.pending_pro'
          },
          (payload) => {
            const newBooking = payload.new as any;
            const oldBooking = payload.old as any;
            
            if (newBooking.status === 'pending_pro' && oldBooking.status !== 'pending_pro') {
              const message = `Booking request for "${newBooking.event_name}" requires final approval`;
              
              toast({
                title: "Final Approval Required",
                description: message,
                variant: "default"
              });

              const notification: Notification = {
                id: Date.now().toString(),
                title: "Final Approval Required",
                message,
                type: 'new_booking',
                created_at: new Date().toISOString(),
                read: false
              };
              
              setNotifications(prev => [notification, ...prev]);
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
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