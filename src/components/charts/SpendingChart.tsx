"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type Props = {
  data: { name: string; value: number }[];
};

const COLORS = [
  "#6366f1", // Indigo 500
  "#8b5cf6", // Violet 500
  "#ec4899", // Pink 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#3b82f6", // Blue 500
  "#64748b", // Slate 500
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 sm:p-4 rounded-xl shadow-xl border border-slate-100 z-50 relative">
        <p className="text-slate-600 text-[10px] sm:text-xs font-semibold mb-1 uppercase tracking-wider">
          {payload[0].name}
        </p>
        <p className="text-indigo-600 font-bold text-base sm:text-lg">
          #{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function SpendingChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        No spending data yet
      </div>
    );
  }

  return (
    // 1. Responsive Height:
    // Mobile: h-[300px] (Tall enough for chart + legend stacking)
    // Desktop: h-64 (Standard height)
    <div className="h-[300px] sm:h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={100} debounce={1}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            // 2. Percentage-based Radius:
            // This ensures the donut scales relative to the container size
            // rather than being fixed pixel widths.
            innerRadius="55%" 
            outerRadius="75%" 
            paddingAngle={5}
            dataKey="value"
            cornerRadius={6}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                className="stroke-transparent outline-none"
              />
            ))}
          </Pie>
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            // 3. Responsive Legend Margin:
            wrapperStyle={{ paddingTop: "20px" }}
            // 4. Responsive Text Size:
            // Smaller text on mobile to prevent overflow
            formatter={(value) => (
              <span className="text-slate-600 text-xs sm:text-sm font-medium ml-1">
                {value}
              </span>
            )} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}