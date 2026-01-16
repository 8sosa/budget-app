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
    <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
      
      {/* Toggle View Mode */}
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg transition-colors">
        <button
          onClick={() => updateParams({ view: "monthly" })}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            viewMode === "monthly" 
              ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => updateParams({ view: "yearly" })}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
            viewMode === "yearly" 
              ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400" 
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          }`}
        >
          Yearly
        </button>
      </div>

      {/* Date Selectors */}
      <div className="flex gap-2 w-full sm:w-auto">
        {/* Only show Month selector if in Monthly view */}
        {viewMode === "monthly" && (
          <select
            value={currentMonth}
            onChange={(e) => updateParams({ month: e.target.value })}
            className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
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
          className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
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