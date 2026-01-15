// src/app/dashboard/page.tsx
export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import UploadReceipt from "@/components/forms/uploadReceipt"; 
import SpendingChart from "@/components/charts/SpendingChart";
import TransactionItem from "@/components/ui/TransactionItem";
import BudgetManager from "@/components/forms/BudgetManager";
import DateFilter from "@/components/ui/DateFilter";
import { getBudgetForPeriod, getYearlyTotalLimit } from "@/lib/budgetUtils";

// --- DECORATIVE ICONS COMPONENT ---
const BackgroundDecorations = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Top Right - Wallet */}
    <div className="absolute top-10 right-[-50px] opacity-[0.03] rotate-12 text-blue-900">
      <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 7h-3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 9a2 2 0 0 1 2-2h10v2H6v10h10v2H6a2 2 0 0 1-2-2V9z" />
      </svg>
    </div>
    
    {/* Bottom Left - Pie Chart */}
    <div className="absolute bottom-[-50px] left-[-20px] opacity-[0.04] -rotate-12 text-indigo-900">
      <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor"/>
      </svg>
    </div>

    {/* Center Right - Trending Up */}
    <div className="absolute top-[40%] right-[10%] opacity-[0.02] rotate-6 text-green-900">
      <svg width="250" height="250" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    </div>
  </div>
);

export default async function Dashboard({
  searchParams,
}: {
  // 1. Update Type: It is now a Promise
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // 2. Await the params
  const params = await searchParams;

  // 3. Use 'params' (not searchParams) for the logic
  const today = new Date();
  
  const year = typeof params.year === 'string' ? parseInt(params.year) : today.getFullYear();
  const month = typeof params.month === 'string' ? parseInt(params.month) : today.getMonth();
  const viewMode = typeof params.view === 'string' ? params.view : 'monthly';

  let startDate: Date, endDate: Date;

  if (viewMode === 'yearly') {
    // Yearly: Jan 1 to Jan 1 of next year
    startDate = new Date(year, 0, 1);
    endDate = new Date(year + 1, 0, 1);
  } else {
    // Monthly: First day of Month to First day of NEXT Month
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 1);
  }

  // 2. Fetch Data
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    include: {
      transactions: {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'desc' },
      },
      budgets: true,
    }
  });

  if (!user) return <div>User not found</div>;

 // 4. CALCULATE TOTALS
  let totalSpent = 0;
  const spendingByCategory: Record<string, number> = {};

  user.transactions.forEach((t) => {
    const cat = t.category || "Other";
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + t.amount;
    totalSpent += t.amount;
  });

  // 5. DETERMINE WHICH BUDGET TO COMPARE AGAINST
  let activeBudgetLimit = 0;
  const { globalLimit, categories } = await getBudgetForPeriod(session.user?.email!, month, year);

  if (viewMode === 'yearly') {
    // ✅ NEW: Calculate the smart sum of all months
    activeBudgetLimit = await getYearlyTotalLimit(session.user?.email!, year);
  } else {
    // Monthly View: Use the limit for this specific month
    activeBudgetLimit = globalLimit;
  }
  
  // Math logic
  const totalPercentage = activeBudgetLimit > 0 ? Math.min(100, (totalSpent / activeBudgetLimit) * 100) : 0;
  const isOverTotal = totalSpent > activeBudgetLimit;
  const remaining = activeBudgetLimit - totalSpent;
  const chartData = Object.entries(spendingByCategory).map(([name, value]) => ({ name, value }));
  const budgetCategories = user.budgets.map((b) => b.category);

  return (
    // UPDATED: Main Gradient Container
    // Added overflow-x-hidden to prevent horizontal scroll from background svgs on mobile
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 selection:bg-indigo-100 overflow-x-hidden">
      
      {/* Background Layer */}
      <BackgroundDecorations />

      {/* Main Content Layer */}
      {/* Adjusted padding: smaller on mobile (px-4), larger on desktop (md:p-10) */}
      <div className="relative z-10 px-4 py-6 sm:p-8 md:p-10">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          <DateFilter />
          {/* --- HEADER: Glassmorphism Effect --- */}
          {/* Adjusted padding for mobile */}
          <div className="bg-white/80 backdrop-blur-md p-5 sm:p-8 rounded-3xl shadow-lg shadow-indigo-100/50 border border-white/50">
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                 <div>
                    <h1 className="text-xl font-bold text-slate-700">
                     {/* Dynamic Title */}
                     {viewMode === 'yearly' ? `${year} Annual Overview` : `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`}
                   </h1>
                     <div className="flex flex-wrap items-baseline gap-2 mt-2">
                         {/* Responsive font size: smaller on mobile to prevent overflow */}
                         <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                             #{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                         <span className="text-sm sm:text-lg text-slate-400 font-medium whitespace-nowrap">
                             / #{activeBudgetLimit.toLocaleString()}
                         </span>
                     </div>
                 </div>

                 {/* Status Box: Full width on mobile, right aligned on desktop */}
                 <div className="w-full md:w-auto text-left md:text-right bg-white/50 p-3 rounded-xl border border-slate-100">
                     <p className={`text-sm font-bold uppercase tracking-wider ${isOverTotal ? 'text-red-500' : 'text-emerald-600'}`}>
                         {isOverTotal ? '⚠️ Over Budget' : '✅ On Track'}
                     </p>
                     <p className="text-sm text-slate-500 mt-1">
                         {isOverTotal 
                           ? `Exceeded by #${Math.abs(remaining).toLocaleString()}` 
                           : `#${remaining.toLocaleString()} remaining`
                         }
                     </p>
                 </div>
             </div>

             {/* Global Progress Bar */}
             <div className="relative w-full bg-slate-100 rounded-full h-4 sm:h-5 overflow-hidden shadow-inner">
                 <div 
                     className={`h-full transition-all duration-1000 ease-out shadow-sm ${
                         isOverTotal ? 'bg-red-500' : 'bg-gradient-to-r from-blue-600 to-indigo-500'
                     }`}
                     style={{ width: `${totalPercentage}%` }}
                 ></div>
             </div>
          </div>

          {/* --- MAIN CONTENT GRID --- */}
          {/* Grid stack on mobile (default), 2 cols on lg screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
              {/* Cards: Adjusted padding (p-4 mobile, p-6 desktop) */}
              
              <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>⚙️</span> Budget Settings
                </h2>
                <BudgetManager 
                  monthlyBudget={globalLimit}
                  yearlyBudget={user.yearlyBudget} 
                  budgets={categories}
                  currentMonth={month} 
                  currentYear={year}
                  initialView={viewMode as 'monthly' | 'yearly'}
                />
              </section>
              
              <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                  <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>➕</span> Add Transaction
                  </h2>
                  <UploadReceipt budgetCategories={budgetCategories} />
              </section>

              <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>📊</span> Spending Breakdown
                </h2>
                {/* Ensure chart container handles overflow or scaling */}
                <div className="w-full overflow-hidden">
                    {totalSpent > 0 ? (
                       <SpendingChart data={chartData} />
                    ) : (
                       <div className="h-48 flex items-center justify-center text-slate-400 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                         No spending data yet
                       </div>
                    )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            {/* On mobile, we might want Recent Transactions closer to top, 
                but usually summaries (Categories) come first. 
                Order-1 ensures this column stays on top on mobile if desired, 
                or remove 'order-' classes to follow HTML structure. 
                Here: Left column is actions (order-2 on mobile), Right is display (order-1 on mobile) */}
            <div className="space-y-6 md:space-y-8 order-1 lg:order-2">
              
              {/* CATEGORY PROGRESS BARS */}
              <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <span>🎯</span> Category Limits
                </h2>
                
                {user.budgets.length === 0 ? (
                  <p className="text-slate-400 text-sm">No specific category limits set.</p>
                ) : (
                  <div className="space-y-6">
                    {user.budgets.map(budget => {
                      const spent = spendingByCategory[budget.category] || 0;
                      const percentage = Math.min(100, (spent / budget.limit) * 100);
                      const isOver = spent > budget.limit;
                      
                      return (
                        <div key={budget.id} className="group">
                          {/* Flex wrap allows text to stack on very small screens */}
                          <div className="flex flex-wrap justify-between text-sm mb-2 gap-1">
                            <span className="font-semibold text-slate-700">{budget.category}</span>
                            <span className={isOver ? "text-red-600 font-bold" : "text-slate-500"}>
                              #{spent.toLocaleString()} <span className="text-xs text-slate-300">/</span> {budget.limit.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* TRANSACTIONS LIST */}
              <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span>💳</span> Recent Transactions
                </h2>
                <div className="space-y-2">
                  {user.transactions.map(t => (
                    // Using -mx-2 logic but ensuring container has padding so it doesn't bleed
                    <div key={t.id} className="hover:bg-slate-50 rounded-lg transition-colors -mx-2 px-2 py-1">
                        <TransactionItem 
                            id={t.id}
                            description={t.description || "Unknown"}
                            amount={t.amount}
                            date={t.date}
                            category={t.category}
                        />
                    </div>
                  ))}
                  
                  {user.transactions.length === 0 && (
                    <p className="text-slate-400 text-sm py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No transactions found for this month.
                    </p>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}