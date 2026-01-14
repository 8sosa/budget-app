"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type Props = {
  data: { name: string; value: number }[];
};

// --- NEW MODERN PALETTE ---
// Matches the Indigo/Slate/Violet vibe of your dashboard
const COLORS = [
  "#6366f1", // Indigo 500
  "#8b5cf6", // Violet 500
  "#ec4899", // Pink 500
  "#10b981", // Emerald 500
  "#f59e0b", // Amber 500
  "#3b82f6", // Blue 500
  "#64748b", // Slate 500 (Fallback)
];

// --- CUSTOM TOOLTIP COMPONENT ---
// Replaces the default tooltip with a clean, branded card
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
        <p className="text-slate-600 text-xs font-semibold mb-1 uppercase tracking-wider">
          {payload[0].name}
        </p>
        <p className="text-indigo-600 font-bold text-lg">
          #{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export default function SpendingChart({ data }: Props) {
  // If no data, show the dashed empty state style from the dashboard
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        No spending data yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60} // Creates the "Donut" hole
            outerRadius={85} // Slightly thicker ring
            paddingAngle={5} // Spacing between slices
            dataKey="value"
            cornerRadius={6} // Rounds the edges of the slices
            stroke="none" // Removes the default white border
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
            formatter={(value) => <span className="text-slate-600 text-sm font-medium ml-1">{value}</span>} 
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}