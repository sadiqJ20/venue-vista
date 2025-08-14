import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Hall {
  id: string;
  name: string;
  block: string;
  type: string;
  capacity: number;
  has_ac: boolean;
  has_mic: boolean;
  has_projector: boolean;
  has_audio_system: boolean;
}

interface HallAvailability extends Hall {
  isAvailable: boolean;
  bookedUntil?: string;
  currentBooking?: {
    event_name: string;
    faculty_name: string;
    end_time: string;
    event_date: string;
  };
}

export const useHallAvailability = () => {
  const [halls, setHalls] = useState<HallAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHallsWithAvailability = async () => {
    setLoading(true);
    try {
      // Get all halls
      const { data: hallsData, error: hallsError } = await supabase
        .from('halls')
        .select('*')
        .order('block', { ascending: true });

      if (hallsError) throw hallsError;

      // Get all active bookings for today and future dates
      const today = new Date().toISOString().split('T')[0];
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('hall_id, event_name, faculty_name, event_date, start_time, end_time')
        .gte('event_date', today)
        .in('status', ['approved', 'pending_hod', 'pending_principal', 'pending_pro']);

      if (bookingsError) throw bookingsError;

      // Create availability map
      const now = new Date();
      const hallsWithAvailability: HallAvailability[] = (hallsData || []).map(hall => {
        // Find active booking for this hall
        const activeBooking = (bookingsData || []).find(booking => {
          if (booking.hall_id !== hall.id) return false;
          
          const bookingDate = new Date(booking.event_date);
          const bookingEndTime = new Date(`${booking.event_date}T${booking.end_time}`);
          
          // Check if booking is currently active (event date is today and end time hasn't passed)
          const isToday = bookingDate.toDateString() === now.toDateString();
          const isActive = isToday && bookingEndTime > now;
          
          return isActive;
        });

        return {
          ...hall,
          isAvailable: !activeBooking,
          bookedUntil: activeBooking ? activeBooking.end_time : undefined,
          currentBooking: activeBooking || undefined
        };
      });

      setHalls(hallsWithAvailability);
    } catch (error) {
      console.error('Error fetching hall availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkHallAvailability = async (
    hallId: string,
    eventDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_hall_available', {
        hall_id_param: hallId,
        event_date_param: eventDate,
        start_time_param: startTime,
        end_time_param: endTime,
        exclude_booking_id: excludeBookingId || null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error checking hall availability:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchHallsWithAvailability();
    
    // Refresh availability every minute
    const interval = setInterval(fetchHallsWithAvailability, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    halls,
    loading,
    refreshAvailability: fetchHallsWithAvailability,
    checkHallAvailability
  };
};