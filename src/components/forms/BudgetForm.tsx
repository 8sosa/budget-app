"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Food", "Transport", "Utilities", "Entertainment", "Shopping", "Health", "Housing", "Other"];

// Optional: You might want to pass existing budgets via props later to display them
type Props = {
  globalBudget?: number;
  budgets?: any[]; 
};

export default function BudgetManager({ globalBudget, budgets }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      category: formData.get("category"),
      amount: Number(formData.get("amount")),
    };

    try {
        await fetch("/api/budgets", {
            method: "POST",
            body: JSON.stringify(data),
        });
        router.refresh();
        // Optional: Reset form here if needed
        (e.target as HTMLFormElement).reset();
    } catch (error) {
        console.error("Failed to save budget", error);
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <p className="text-sm text-slate-500 mb-4">
        Set limits for specific categories to track your spending habits.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* RESPONSIVE GRID: 
            - grid-cols-1 on mobile (stacked)
            - sm:grid-cols-2 on small tablets and up (side-by-side)
        */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          {/* CATEGORY SELECT */}
          <div className="relative group">
            <select 
                name="category" 
                className="
                  w-full appearance-none 
                  bg-slate-50 border border-slate-200 
                  text-slate-700 rounded-xl 
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                  block p-3 pr-10 transition-all outline-none
                  text-base sm:text-sm /* Prevents iOS Zoom on mobile */
                "
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Custom Arrow Icon */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* AMOUNT INPUT */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-slate-400 font-bold">#</span>
            </div>
            <input 
              name="amount" 
              type="number" 
              placeholder="0.00" 
              required 
              className="
                w-full bg-slate-50 border border-slate-200 
                text-slate-700 rounded-xl 
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                block p-3 pl-8 transition-all outline-none 
                placeholder:text-slate-300
                text-base sm:text-sm /* Prevents iOS Zoom on mobile */
              "
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button 
          disabled={loading}
          className="
            w-full flex justify-center items-center gap-2
            bg-indigo-600 hover:bg-indigo-700 
            text-white font-medium 
            text-sm sm:text-sm
            py-3 px-5 rounded-xl 
            transition-all duration-200 
            shadow-md shadow-indigo-200
            disabled:opacity-70 disabled:cursor-not-allowed
            active:scale-[0.98] /* Adds a nice click effect on mobile */
          "
        >
          {loading ? (
             <>
               <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <span>Saving...</span>
             </>
          ) : (
            <>
               <span>Set Limit</span>
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </>
          )}
        </button>
      </form>
    </div>
  );
}