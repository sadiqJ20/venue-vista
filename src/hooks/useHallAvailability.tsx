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
    start_time: string;
    end_time: string;
    event_date: string;
  };
}

export const useHallAvailability = () => {
  const [halls, setHalls] = useState<HallAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchHallsWithAvailability = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching halls...');
      // Get all halls
      const { data: hallsData, error: hallsError } = await supabase
        .from('halls')
        .select('*')
        .order('block', { ascending: true });

      if (hallsError) {
        console.error('Error fetching halls:', hallsError);
        throw hallsError;
      }

      console.log(`Fetched ${hallsData?.length || 0} halls`);

      // Get all active bookings for today and future dates
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching bookings from:', today);
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('hall_id, event_name, faculty_name, event_date, start_time, end_time, status')
        .gte('event_date', today)
        .in('status', ['approved', 'pending_hod', 'pending_principal', 'pending_pro']);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }
      
      console.log(`Fetched ${bookingsData?.length || 0} active bookings`);

      // Debug: Log all bookings to understand what we're working with
      console.log('All bookings fetched (cross-faculty):', bookingsData);
      console.log('Total bookings found:', bookingsData?.length || 0);
      console.log('Bookings by faculty:', bookingsData?.reduce((acc, booking) => {
        acc[booking.faculty_name] = (acc[booking.faculty_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {});

      // Create availability map
      const now = new Date();
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
      
      const hallsWithAvailability: HallAvailability[] = (hallsData || []).map(hall => {
        // Find all bookings for this specific hall
        const hallBookings = (bookingsData || []).filter(booking => {
          return booking.hall_id === hall.id;
        });

        // Check if there's a booking happening RIGHT NOW for this hall
        const currentBooking = hallBookings.find(booking => {
          // Must be for today
          if (booking.event_date !== today) return false;
          
          // Check if current time is within the booking time range
          const bookingStartTime = booking.start_time;
          const bookingEndTime = booking.end_time;
          
          return currentTime >= bookingStartTime && currentTime <= bookingEndTime;
        });

        // Find the next upcoming booking for today (if no current booking)
        const nextBookingToday = !currentBooking ? hallBookings
          .filter(booking => {
            // Must be for today
            if (booking.event_date !== today) return false;
            
            // Must be in the future
            return booking.start_time > currentTime;
          })
          .sort((a, b) => a.start_time.localeCompare(b.start_time))[0] : null;

        // Hall is available if there's no current booking happening right now
        const isCurrentlyAvailable = !currentBooking;

        // Debug logging for all halls to understand what's happening
        console.log(`Hall ${hall.name} (${hall.id.substring(0, 8)}):`, {
          totalBookings: hallBookings.length,
          todayBookings: hallBookings.filter(b => b.event_date === today).length,
          currentBooking: currentBooking ? {
            event: currentBooking.event_name,
            faculty: currentBooking.faculty_name,
            time: `${currentBooking.start_time}-${currentBooking.end_time}`,
            status: currentBooking.status
          } : null,
          nextBookingToday: nextBookingToday ? {
            event: nextBookingToday.event_name,
            faculty: nextBookingToday.faculty_name,
            time: `${nextBookingToday.start_time}-${nextBookingToday.end_time}`
          } : null,
          isCurrentlyAvailable,
          currentTime,
          allBookingsToday: hallBookings.filter(b => b.event_date === today).map(b => ({
            faculty: b.faculty_name,
            time: `${b.start_time}-${b.end_time}`,
            status: b.status
          }))
        });

        return {
          ...hall,
          isAvailable: isCurrentlyAvailable,
          bookedUntil: currentBooking ? currentBooking.end_time : (nextBookingToday ? nextBookingToday.end_time : undefined),
          currentBooking: currentBooking || undefined
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
      const { data, error } = await supabase.rpc('get_available_halls', {
        hall_id_param: hallId,
        event_date_param: eventDate,
        start_time_param: startTime,
        end_time_param: endTime,
        exclude_booking_id: excludeBookingId || null
      });

      if (error) {
        console.error('Error checking hall availability:', error);
        return false;
      }
      
      // If we got data back, check if the hall is in the available halls list
      if (Array.isArray(data)) {
        return data.some((hall: { id: string }) => hall.id === hallId);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking hall availability:', error);
      return false;
    }
  };

  const getHallAvailabilityStatus = async (
    hallId: string,
    eventDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<{ available: boolean; reason: string; conflictingBooking?: unknown }> => {
    try {
      // For now, use the simple availability check and return a basic status
      const isAvailable = await checkHallAvailability(hallId, eventDate, startTime, endTime, excludeBookingId);
      return {
        available: isAvailable,
        reason: isAvailable ? 'Hall is available for the requested time slot' : 'Hall is not available for the requested time slot'
      };
    } catch (error) {
      console.error('Error getting hall availability status:', error);
      return { available: false, reason: 'Error checking availability' };
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
    checkHallAvailability,
    getHallAvailabilityStatus
  };
};