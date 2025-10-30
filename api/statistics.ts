import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type BookingRow = {
  hall_id: string;
  department: string | null;
  event_date: string;
  halls?: { name?: string | null } | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yetmpnthnalztcxfqwnq.supabase.co';
    const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let query = supabase
      .from('bookings')
      .select(`
        hall_id,
        department,
        event_date,
        halls:hall_id ( name )
      `);

    if (fromDate) {
      query = query.gte('event_date', fromDate);
    }
    if (toDate) {
      query = query.lte('event_date', toDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as BookingRow[];

    const hallCounts: Record<string, number> = {};
    const departmentCounts: Record<string, number> = {};

    // Include all departments, even those with zero bookings in the range
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

    const hallEntries = Object.entries(hallCounts).map(([name, count]) => ({ name, count }));
    const departmentEntries = Object.entries(departmentCounts).map(([name, count]) => ({ name, count }));

    hallEntries.sort((a, b) => b.count - a.count);
    departmentEntries.sort((a, b) => b.count - a.count);

    const topK = 5;
    const mostUsedHalls = hallEntries.slice(0, Math.min(topK, hallEntries.length));
    const leastUsedHalls = [...hallEntries].reverse().slice(0, Math.min(topK, hallEntries.length));

    const mostActiveDepartments = departmentEntries.slice(0, Math.min(topK, departmentEntries.length));
    const leastActiveDepartments = [...departmentEntries].reverse().slice(0, Math.min(topK, departmentEntries.length));

    res.status(200).json({
      fromDate: fromDate || null,
      toDate: toDate || null,
      totalBookings: rows.length,
      halls: {
        mostUsed: mostUsedHalls,
        leastUsed: leastUsedHalls,
      },
      departments: {
        mostActive: mostActiveDepartments,
        leastActive: leastActiveDepartments,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Unexpected error' });
  }
}
