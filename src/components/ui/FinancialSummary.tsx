// src/components/FinancialSummary.tsx
export function FinancialSummary({ 
  inflow, 
  outflow, 
  netWorth 
}: { 
  inflow: number; 
  outflow: number; 
  netWorth: number; 
}) {
  const monthlySavings = inflow - outflow;
  const savingsRate = inflow > 0 ? Math.round((monthlySavings / inflow) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Net Worth - The "Big Picture" */}
      <div className="bg-slate-900 dark:bg-white p-6 rounded-3xl shadow-xl shadow-slate-200 dark:shadow-none">
        <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Total Net Worth</p>
        <p className="text-2xl font-black text-white dark:text-slate-900 mt-1">
          ₦{netWorth.toLocaleString()}
        </p>
      </div>

      {/* Monthly Inflow */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Monthly Inflow</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-black text-emerald-500">₦{inflow.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-600 font-bold">↑</span>
        </div>
      </div>
      
      {/* Monthly Outflow */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Monthly Outflow</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-black text-red-500">₦{outflow.toLocaleString()}</p>
          <span className="text-[10px] text-red-600 font-bold">↓</span>
        </div>
      </div>

      {/* Monthly Savings */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Monthly Savings</p>
        <div className="flex items-center justify-between mt-1">
          <p className={`text-2xl font-black ${monthlySavings >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500'}`}>
            ₦{monthlySavings.toLocaleString()}
          </p>
          {savingsRate > 0 && (
            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-1 rounded-lg">
              {savingsRate}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}