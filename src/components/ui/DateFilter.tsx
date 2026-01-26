"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation"; 

export default function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ CRITICAL: You must call this hook to get "/budget"
  const pathname = usePathname(); 

  // Default to today if no params exist
  const today = new Date();
  const currentMonth = searchParams.get("month") 
    ? parseInt(searchParams.get("month")!) 
    : today.getMonth();

  const currentYear = searchParams.get("year") 
    ? parseInt(searchParams.get("year")!) 
    : today.getFullYear();

  const viewMode = searchParams.get("view") || "monthly";

  const updateParams = (updates: Record<string, string | number>) => {
    // 1. Create a copy of current params
    const params = new URLSearchParams(searchParams.toString());
    
    // 2. Update the specific key (month or year)
    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, String(value));
    });

    // 3. ✅ CRITICAL: Use backticks (`) and ensure pathname is used
    // This constructs "/budget?month=4" instead of "/?month=4"
    if (pathname) {
      router.push(`${pathname}?${params.toString()}`);
    } else {
      // Fallback just in case
      router.push(`?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-950 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
      
      {/* View Toggles */}
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

      {/* Selectors */}
      <div className="flex gap-2 w-full sm:w-auto">
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

        <select
          value={currentYear}
          onChange={(e) => updateParams({ year: e.target.value })}
          className="flex-1 sm:flex-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg p-2.5 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
        >
          {Array.from({ length: 8 }).map((_, i) => {
            const y = 2023 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>
    </div>
  );
}