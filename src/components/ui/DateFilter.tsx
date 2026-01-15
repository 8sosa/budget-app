"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Get current values from URL or default to Today
  const today = new Date();
  
  const currentMonth = searchParams.get("month") 
    ? parseInt(searchParams.get("month")!) 
    : today.getMonth(); // 0-11

  const currentYear = searchParams.get("year") 
    ? parseInt(searchParams.get("year")!) 
    : today.getFullYear();

  const viewMode = searchParams.get("view") || "monthly"; // "monthly" | "yearly"

  // 2. Helper to push new params
  const updateParams = (updates: Record<string, string | number>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, String(value));
    });
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      
      {/* Toggle View Mode */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => updateParams({ view: "monthly" })}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
            viewMode === "monthly" ? "bg-white shadow text-indigo-600" : "text-slate-500"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => updateParams({ view: "yearly" })}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
            viewMode === "yearly" ? "bg-white shadow text-indigo-600" : "text-slate-500"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Date Selectors */}
      <div className="flex gap-2">
        {/* Only show Month selector if in Monthly view */}
        {viewMode === "monthly" && (
          <select
            value={currentMonth}
            onChange={(e) => updateParams({ month: e.target.value })}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        )}

        {/* Year Selector (Always visible) */}
        <select
          value={currentYear}
          onChange={(e) => updateParams({ year: e.target.value })}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {/* Generate years: 2023 to 2030 */}
          {Array.from({ length: 8 }).map((_, i) => {
            const y = 2023 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>
    </div>
  );
}