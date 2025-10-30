import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UsageEntry {
  name: string;
  count: number;
}

export interface StatisticsResponse {
  fromDate: string | null;
  toDate: string | null;
  totalBookings: number;
  halls: {
    mostUsed: UsageEntry[];
    leastUsed: UsageEntry[];
  };
  departments: {
    mostActive: UsageEntry[];
    leastActive: UsageEntry[];
  };
}

export function useStatistics(initialFrom?: string | null, initialTo?: string | null) {
  const [fromDate, setFromDate] = useState<string | null>(initialFrom ?? null);
  const [toDate, setToDate] = useState<string | null>(initialTo ?? null);
  const [data, setData] = useState<StatisticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    return params.toString();
  }, [fromDate, toDate]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try API first (works in Vercel). If it fails (e.g., during Vite dev), fall back to client-side aggregation.
      const url = query ? `/api/statistics?${query}` : "/api/statistics";
      let json: StatisticsResponse | null = null;
      try {
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const text = await res.text();
        if (!res.ok) throw new Error(text || `Request failed with ${res.status}`);
        json = JSON.parse(text) as StatisticsResponse;
      } catch (_apiErr) {
        // Client-side fallback using Supabase directly
        type BookingRow = {
          hall_id: string;
          department: string | null;
          event_date: string;
          halls?: { name?: string | null } | null;
        };

        let queryBuilder = supabase
          .from('bookings')
          .select(`
            hall_id,
            department,
            event_date,
            halls:hall_id ( name )
          `);

        if (fromDate) queryBuilder = queryBuilder.gte('event_date', fromDate);
        if (toDate) queryBuilder = queryBuilder.lte('event_date', toDate);

        const { data: rowsRaw, error: sbError } = await queryBuilder;
        if (sbError) throw sbError;
        const rows = (rowsRaw || []) as BookingRow[];

        const hallCounts: Record<string, number> = {};
        const departmentCounts: Record<string, number> = {};

        // Include all departments with zero to reflect least-active properly
        const ALL_DEPARTMENTS: string[] = [
          "CSE",
          "IT",
          "ECE",
          "EEE",
          "MECH",
          "CIVIL",
          "AERO",
          "CHEMICAL",
          "AIDS",
          "CSBS",
          "MCA",
          "MBA",
          "TRAINING",
          "PLACEMENT",
          "SCIENCE & HUMANITIES",
          "HR",
          "INNOVATION",
          "AI_ML",
        ];
        for (const d of ALL_DEPARTMENTS) {
          departmentCounts[d] = 0;
        }
        for (const row of rows) {
          const hallName = row.halls?.name ?? 'Unknown';
          hallCounts[hallName] = (hallCounts[hallName] ?? 0) + 1;
          const dept = row.department ?? 'Unknown';
          departmentCounts[dept] = (departmentCounts[dept] ?? 0) + 1;
        }
        const hallEntries = Object.entries(hallCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        const departmentEntries = Object.entries(departmentCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

        const topK = 5;
        const mostUsedHalls = hallEntries.slice(0, Math.min(topK, hallEntries.length));
        const leastUsedHalls = [...hallEntries].reverse().slice(0, Math.min(topK, hallEntries.length));

        const mostActiveDepartments = departmentEntries.slice(0, Math.min(topK, departmentEntries.length));
        const leastActiveDepartments = [...departmentEntries].reverse().slice(0, Math.min(topK, departmentEntries.length));

        json = {
          fromDate: fromDate ?? null,
          toDate: toDate ?? null,
          totalBookings: rows.length,
          halls: {
            mostUsed: mostUsedHalls,
            leastUsed: leastUsedHalls,
          },
          departments: {
            mostActive: mostActiveDepartments,
            leastActive: leastActiveDepartments,
          },
        };
      }
      setData(json!);
    } catch (err: any) {
      setError(err?.message ?? "Failed to fetch statistics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    data,
    loading,
    error,
    refetch: fetchStats,
  } as const;
}


