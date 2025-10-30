import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility function to validate time format (HH:MM)
const isValidTimeFormat = (time: string): boolean => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

// Utility function to convert time string to minutes since midnight
const timeToMinutes = (time: string): number => {
  if (!isValidTimeFormat(time)) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

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

      // Get all active bookings (both past and future)
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching all active bookings...');
      
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, hall_id, event_name, faculty_name, event_date, start_time, end_time, status')
        .in('status', ['approved', 'pending_hod', 'pending_principal', 'pending_pro'])
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

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

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
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
        const nextBookingToday = !currentBooking 
          ? hallBookings
              .filter(booking => {
                // Must be for today and in the future
                return booking.event_date === today && booking.start_time > currentTime;
              })
              .sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
          : null;

        // Get all upcoming bookings (today and future)
        const upcomingBookings = hallBookings.filter(booking => {
          const bookingDate = new Date(booking.event_date);
          const todayDate = new Date(today);
          
          // If booking is today, check if it's in the future
          if (booking.event_date === today) {
            return booking.start_time > currentTime;
          }
          
          // If booking is in the future
          return bookingDate > todayDate;
        });

        // Hall is available if there's no current booking happening right now
        const isCurrentlyAvailable = !currentBooking;

        // Debug logging for the hall
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
          upcomingBookings: upcomingBookings.map(b => ({
            date: b.event_date,
            time: `${b.start_time}-${b.end_time}`,
            event: b.event_name,
            status: b.status
          }))
        });

        return {
          ...hall,
          isAvailable: isCurrentlyAvailable,
          bookedUntil: currentBooking 
            ? currentBooking.end_time 
            : nextBookingToday 
              ? nextBookingToday.end_time 
              : upcomingBookings.length > 0
                ? `${upcomingBookings[0].event_date} ${upcomingBookings[0].start_time}`
                : undefined,
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
      console.log('Checking hall availability:', { hallId, eventDate, startTime, endTime, excludeBookingId });
      
      // Validate time format
      if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        console.error('Invalid time format');
        return false;
      }
      
      // Check if end time is after start time
      if (startTime >= endTime) {
        console.log('End time must be after start time');
        return false;
      }
      
      // Check if the requested time is in the past
      const today = new Date();
      const currentDate = today.toISOString().split('T')[0];
      const currentTime = today.toTimeString().split(' ')[0].substring(0, 5);
      
      if (eventDate < currentDate || (eventDate === currentDate && startTime < currentTime)) {
        console.log('Requested time is in the past');
        return false;
      }
      
      // Check for overlapping bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, status')
        .eq('hall_id', hallId)
        .eq('event_date', eventDate)
        .in('status', ['approved', 'pending_hod', 'pending_principal', 'pending_pro']);
        
      if (error) {
        console.error('Error fetching bookings:', error);
        return false;
      }
      
      // If no bookings exist for this hall on this date, it's available
      if (!bookings || bookings.length === 0) {
        console.log('No existing bookings found for this hall on the selected date');
        return true;
      }
      
      // Check for time conflicts
      const hasConflict = bookings.some(booking => {
        // Skip the booking we're excluding (for updates)
        if (excludeBookingId && booking.id === excludeBookingId) return false;
        
        // Convert times to minutes for easier comparison
        const requestedStart = timeToMinutes(startTime);
        const requestedEnd = timeToMinutes(endTime);
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = timeToMinutes(booking.end_time);
        
        // Check if the time ranges overlap
        return (
          (requestedStart >= bookingStart && requestedStart < bookingEnd) ||
          (requestedEnd > bookingStart && requestedEnd <= bookingEnd) ||
          (requestedStart <= bookingStart && requestedEnd >= bookingEnd)
        );
      });
      
      const isAvailable = !hasConflict;
      console.log('Hall availability check result:', isAvailable, {
        hasConflict,
        existingBookings: bookings.map(b => ({
          id: b.id,
          start: b.start_time,
          end: b.end_time,
          status: b.status
        }))
      });
      
      return isAvailable;
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
  ): Promise<{ available: boolean; reason: string; conflictingBooking?: any }> => {
    try {
      console.log('Getting hall availability status:', { hallId, eventDate, startTime, endTime });
      
      // Validate time format first
      if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        return { 
          available: false, 
          reason: 'Invalid time format. Please use HH:MM format (e.g., 09:30)' 
        };
      }
      
      // Check if end time is after start time
      if (startTime >= endTime) {
        return { 
          available: false, 
          reason: 'End time must be after start time' 
        };
      }
      
      // Check if the requested time is in the past
      const today = new Date();
      const currentDate = today.toISOString().split('T')[0];
      const currentTime = today.toTimeString().split(' ')[0].substring(0, 5);
      
      if (eventDate < currentDate || (eventDate === currentDate && startTime < currentTime)) {
        return { 
          available: false, 
          reason: 'Cannot book a time slot in the past' 
        };
      }
      
      // Check for overlapping bookings
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, event_name, faculty_name, start_time, end_time, status')
        .eq('hall_id', hallId)
        .eq('event_date', eventDate)
        .in('status', ['approved', 'pending_hod', 'pending_principal', 'pending_pro']);
        
      if (error) {
        console.error('Error fetching bookings:', error);
        return { 
          available: false, 
          reason: 'Error checking hall availability. Please try again.' 
        };
      }
      
      // If no bookings exist for this hall on this date, it's available
      if (!bookings || bookings.length === 0) {
        return { 
          available: true, 
          reason: 'Hall is available for the requested time slot' 
        };
      }
      
      // Check for time conflicts
      const conflictingBooking = bookings.find(booking => {
        // Skip the booking we're excluding (for updates)
        if (excludeBookingId && booking.id === excludeBookingId) return false;
        
        // Convert times to minutes for easier comparison
        const requestedStart = timeToMinutes(startTime);
        const requestedEnd = timeToMinutes(endTime);
        const bookingStart = timeToMinutes(booking.start_time);
        const bookingEnd = timeToMinutes(booking.end_time);
        
        // Check if the time ranges overlap
        return (
          (requestedStart >= bookingStart && requestedStart < bookingEnd) ||
          (requestedEnd > bookingStart && requestedEnd <= bookingEnd) ||
          (requestedStart <= bookingStart && requestedEnd >= bookingEnd)
        );
      });
      
      if (conflictingBooking) {
        return {
          available: false,
          reason: `Hall is already booked for this time by ${conflictingBooking.faculty_name} (${conflictingBooking.start_time} - ${conflictingBooking.end_time})`,
          conflictingBooking: {
            id: conflictingBooking.id,
            event: conflictingBooking.event_name,
            faculty: conflictingBooking.faculty_name,
            start: conflictingBooking.start_time,
            end: conflictingBooking.end_time,
            status: conflictingBooking.status
          }
        };
      }
      
      return {
        available: true,
        reason: 'Hall is available for the requested time slot'
      };
    } catch (error) {
      console.error('Error getting hall availability status:', error);
      return { 
        available: false, 
        reason: 'An unexpected error occurred while checking availability' 
      };
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