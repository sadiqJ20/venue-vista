import { memo, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export type UsageDatum = { name: string; count: number };

interface HallUsagePieChartProps {
  data: UsageDatum[];
}

// Simple, soft palette that works well on light backgrounds
const PALETTE = [
  "#60a5fa", // blue-400
  "#34d399", // emerald-400
  "#f59e0b", // amber-500
  "#a78bfa", // violet-400
  "#f472b6", // pink-400
  "#22d3ee", // cyan-400
  "#fb7185", // rose-400
  "#93c5fd", // blue-300
  "#86efac", // green-300
  "#fbbf24", // amber-400
];

/**
 * HallUsagePieChart
 * - Combines most-used and least-used hall data into a single pie
 * - Accepts an already prepared list of { name, count }
 */
const HallUsagePieChart = memo(({ data }: HallUsagePieChartProps) => {
  const normalized = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.name, (map.get(d.name) ?? 0) + d.count);
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [data]);

  const total = useMemo(() => normalized.reduce((s, d) => s + d.count, 0), [normalized]);

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={normalized}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
          >
            {normalized.map((entry, index) => (
              <Cell key={`cell-${entry.name}`} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-2">Total bookings shown: {total}</p>
    </div>
  );
});

export default HallUsagePieChart;


