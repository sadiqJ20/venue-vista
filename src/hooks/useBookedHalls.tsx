import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export interface BookedHall {
  id: string;
  hall_name: string;
  department: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  event_name: string | null;
  faculty_name: string | null;
}

type BookingRow = Tables<'bookings'> & { halls?: { name?: string | null } | null };

export const useBookedHalls = (date: string | null) => {
  const [bookedHalls, setBookedHalls] = useState<BookedHall[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchByDate = useCallback(async (forDate: string | null) => {
    setLoading(true);
    try {
      // Query bookings filtered by date when provided, otherwise default to today
      const q = supabase
        .from('bookings')
        .select(`
          id,
          event_date,
          start_time,
          end_time,
          event_name,
          faculty_name,
          department,
          halls:hall_id ( name )
        `)
        .order('start_time', { ascending: true });

      if (forDate) {
        q.eq('event_date', forDate);
      }

      const { data, error } = await q;
      if (error) throw error;

      type RawRow = {
        id: string;
        event_date: string;
        start_time: string;
        end_time: string;
        event_name?: string | null;
        faculty_name?: string | null;
        department?: string | null;
        halls?: { name?: string | null } | null;
      };

      const rows = (data as RawRow[]) || [];
      const mapped: BookedHall[] = rows.map((row: RawRow) => ({
        id: row.id,
        hall_name: row.halls?.name ?? 'Unknown',
        department: row.department ?? null,
        event_date: row.event_date,
        start_time: row.start_time,
        end_time: row.end_time,
        event_name: row.event_name ?? null,
        faculty_name: row.faculty_name ?? null,
      }));

      setBookedHalls(mapped);
    } catch (err) {
      console.error('Error fetching booked halls:', err);
      setBookedHalls([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch for the current date
    fetchByDate(date);

    // If a date is provided, subscribe to realtime changes for that date
  let channel: ReturnType<typeof supabase.channel> | null = null;
    if (date) {
      try {
        channel = supabase
          .channel(`booked-halls-${date}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bookings', filter: `event_date=eq.${date}` },
            () => fetchByDate(date)
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `event_date=eq.${date}` },
            () => fetchByDate(date)
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'bookings', filter: `event_date=eq.${date}` },
            () => fetchByDate(date)
          )
          .subscribe();
      } catch (err) {
        console.error('Failed to subscribe to realtime bookings:', err);
      }
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.error('Failed to remove booking realtime channel:', err);
        }
      }
    };
  }, [date, fetchByDate]);

  return {
    bookedHalls,
    loading,
    refresh: () => fetchByDate(date),
  };
};
