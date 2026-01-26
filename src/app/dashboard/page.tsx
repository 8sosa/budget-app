export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import UploadReceipt from "@/components/forms/uploadReceipt"; 
import SpendingChart from "@/components/charts/SpendingChart";
import TransactionItem from "@/components/ui/TransactionItem";
import DateFilter from "@/components/ui/DateFilter";
import { getBudgetForPeriod, getYearlyTotalLimit } from "@/lib/budgetUtils";

// --- DECORATIVE ICONS ---
const BackgroundDecorations = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    {/* Top Right - Lilac Wallet */}
    <div className="absolute top-10 right-[-50px] opacity-[0.06] dark:opacity-[0.03] rotate-12 text-primary">
      <svg width="300" height="300" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 7h-3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 9a2 2 0 0 1 2-2h10v2H6v10h10v2H6a2 2 0 0 1-2-2V9z" />
      </svg>
    </div>
    
    {/* Bottom Left - Gold Pie Chart */}
    <div className="absolute bottom-[-50px] left-[-20px] opacity-[0.06] dark:opacity-[0.03] -rotate-12 text-accent">
      <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor"/>
      </svg>
    </div>
  </div>
);

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const params = await searchParams;
  const today = new Date();
  
  const year = typeof params.year === 'string' ? parseInt(params.year) : today.getFullYear();
  const month = typeof params.month === 'string' ? parseInt(params.month) : today.getMonth();
  const viewMode = typeof params.view === 'string' ? params.view : 'monthly';

  // 1. Determine Date Range
  let startDate: Date, endDate: Date;

  if (viewMode === 'yearly') {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year + 1, 0, 0, 23, 59, 59); // End of year
  } else {
    startDate = new Date(year, month, 1);
    endDate = new Date(year, month + 1, 0, 23, 59, 59); // End of month
  }

  // 2. Fetch Data
  const user = await prisma.user.findUnique({
    where: { email: session.user?.email! },
    include: {
      transactions: {
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'desc' },
      },
      // We fetch the CURRENT month's budget to use as a baseline for calculations
      budgets: {
        where: {
          month: month,
          year: year
        }
      },
    }
  });

  if (!user) return <div>User not found</div>;
  const currency = user.currency || "₦"; 

  // 3. Aggregations & Calculations
  let totalSpent = 0;
  const spendingByCategory: Record<string, number> = {};

  user.transactions.forEach((t) => {
    const cat = t.category || "Other";
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + t.amount;
    totalSpent += t.amount;
  });

  // Calculate Global Limits
  let activeBudgetLimit = 0;
  const { globalLimit } = await getBudgetForPeriod(session.user?.email!, month, year);
  
  // FIX: If yearly, ensure the main card limit matches the view
  if (viewMode === 'yearly') {
    const yearlyTotal = await getYearlyTotalLimit(session.user?.email!, year);
    // If user has a specific yearly budget set, use it. Otherwise, project monthly * 12
    activeBudgetLimit = yearlyTotal > 0 ? yearlyTotal : globalLimit * 12;
  } else {
    activeBudgetLimit = globalLimit;
  }
  
  const totalPercentage = activeBudgetLimit > 0 ? Math.min(100, (totalSpent / activeBudgetLimit) * 100) : 0;
  const isOverTotal = totalSpent > activeBudgetLimit;
  const remaining = activeBudgetLimit - totalSpent;
  
  const chartData = Object.entries(spendingByCategory).map(([name, value]) => ({ name, value }));
  const budgetCategories = user.budgets.map((b) => b.category);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden transition-colors duration-500 selection:bg-primary/20">
      
      <BackgroundDecorations />

      <div className="relative z-10 px-4 py-6 sm:p-8 md:p-10">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header Row */}
          <div className="flex max-w-max justify-between items-center bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border z-50">
             <DateFilter />
          </div>

          {/* --- MAIN OVERVIEW CARD --- */}
          <div className="bg-card/80 backdrop-blur-md p-5 sm:p-8 rounded-3xl shadow-xl border border-border/50 ring-1 ring-white/20 z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-muted-foreground flex items-center gap-2">
                        {viewMode === 'yearly' ? '📅 Annual Overview' : '🗓️ Monthly Overview'}
                    </h1>
                      <div className="flex flex-wrap items-baseline gap-2 mt-2">
                          <span className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight">
                              {currency}{totalSpent.toLocaleString()}
                          </span>
                          <span className="text-lg text-muted-foreground font-medium">
                              / {currency}{activeBudgetLimit.toLocaleString()}
                          </span>
                      </div>
                  </div>

                  <div className={`w-full md:w-auto p-4 rounded-xl border border-border/50 text-left md:text-right 
                    ${isOverTotal ? 'bg-red-500/10 text-red-500' : 'bg-secondary/10 text-secondary'}`}>
                      <p className="text-sm font-bold uppercase tracking-wider">
                          {isOverTotal ? '⚠️ Over Budget' : '✅ On Track'}
                      </p>
                      <p className="text-sm opacity-80 mt-1">
                          {isOverTotal 
                            ? `Exceeded by ${currency}${Math.abs(remaining).toLocaleString()}` 
                            : `${currency}${remaining.toLocaleString()} remaining`
                          }
                      </p>
                  </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full bg-muted rounded-full h-4 sm:h-5 overflow-hidden shadow-inner">
                  <div 
                      className={`h-full transition-all duration-1000 ease-out shadow-sm ${
                          isOverTotal 
                            ? 'bg-red-500' 
                            : 'bg-gradient-to-r from-primary via-emerald-400 to-secondary'
                      }`}
                      style={{ width: `${totalPercentage}%` }}
                  ></div>
              </div>
          </div>

          {/* --- CONTENT GRID --- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
              
              <section className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-border hover:border-secondary/40 transition-all duration-300">
                  <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-secondary text-xl">➕</span> Add Transaction
                  </h2>
                  <UploadReceipt budgetCategories={budgetCategories} currencySymbol={currency} />
              </section>

              <section className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-border">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <span className="text-accent text-xl">📊</span> Spending Breakdown
                </h2>
                <div className="w-full overflow-hidden">
                    {totalSpent > 0 ? (
                       <SpendingChart 
                          data={chartData}
                          currencySymbol={currency} 
                        />
                    ) : (
                       <div className="h-48 flex items-center justify-center text-muted-foreground text-sm bg-muted/50 rounded-xl border border-dashed border-border">
                          No spending data yet
                       </div>
                    )}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6 md:space-y-8 order-1 lg:order-2">
              
              {/* Category Limits */}
              <section className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-border">
                <h2 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                    <span className="text-primary text-xl">🎯</span> Category Limits
                </h2>
                
                {user.budgets.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No specific category limits set.</p>
                ) : (
                  <div className="space-y-6">
                    {user.budgets.map(budget => {
                      const spent = spendingByCategory[budget.category] || 0;
                      
                      // FIX: Adjust Limit based on View Mode
                      // If Yearly, we multiply the monthly limit by 12 to create a "Projected Annual Limit"
                      const multiplier = viewMode === 'yearly' ? 12 : 1;
                      const effectiveLimit = budget.limit * multiplier;

                      const percentage = Math.min(100, (spent / effectiveLimit) * 100);
                      const isOver = spent > effectiveLimit;
                      
                      return (
                        <div key={budget.id} className="group">
                          <div className="flex flex-wrap justify-between text-sm mb-2 gap-1">
                            <span className="font-semibold text-foreground">{budget.category}</span>
                            <span className={isOver ? "text-red-500 font-bold" : "text-muted-foreground"}>
                              {currency}{spent.toLocaleString()} <span className="opacity-40">/</span> {effectiveLimit.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-3 overflow-hidden ring-1 ring-border/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-primary'}`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>

              <section className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <span className="text-accent text-xl">💳</span> Recent Transactions
                  </h2>
                  <Link 
                    href="/transactions" 
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline hover:opacity-80 transition-opacity"
                  >
                    View All &rarr;
                  </Link>
                </div>

                <div className="space-y-2">
                  {user.transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="hover:bg-muted/50 rounded-lg transition-colors -mx-2 px-2 py-1">
                        <TransactionItem 
                            id={t.id}
                            description={t.description || "Unknown"}
                            amount={t.amount}
                            date={t.date}
                            category={t.category}
                            currency={currency} 
                            hasReceipt={!!t.receiptUrl}
                        />
                    </div>
                  ))}
                  
                  {user.transactions.length === 0 && (
                    <p className="text-muted-foreground text-sm py-8 text-center bg-muted/30 rounded-xl border border-dashed border-border">
                        No transactions found.
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