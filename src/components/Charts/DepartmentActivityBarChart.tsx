import { memo, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ActivityDatum = { name: string; count: number };

interface DepartmentActivityBarChartProps {
  data: ActivityDatum[];
}

/**
 * DepartmentActivityBarChart
 * - Shows activity per department in a single bar chart
 * - Accepts a prepared union of most-active and least-active department counts
 */
const DepartmentActivityBarChart = memo(({ data }: DepartmentActivityBarChartProps) => {
  const normalized = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.name, (map.get(d.name) ?? 0) + d.count);
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="w-full h-[340px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={normalized} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} height={60} angle={-20} textAnchor="end" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
          <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 8 }} />
          <Bar dataKey="count" name="Bookings" radius={[6, 6, 0, 0]} fill="#60a5fa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default DepartmentActivityBarChart;



