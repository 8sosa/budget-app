import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import BudgetManager from "@/components/forms/BudgetManager";
import DateFilter from "@/components/ui/DateFilter";

type Props = {
  searchParams: Promise<{ month?: string; year?: string; view?: string }>;
};

export default async function BudgetPage(props: Props) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const now = new Date();
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const currentYear = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const viewMode = (searchParams.view as "monthly" | "yearly") || "monthly";

  // 1. Determine Date Range for SPENDING (Transactions)
  let startDate, endDate;
  
  if (viewMode === "yearly") {
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31, 23, 59, 59);
  } else {
    startDate = new Date(currentYear, currentMonth, 1);
    endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  }

  // 2. Fetch User
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      monthlyCaps: {
        where: { month: currentMonth, year: currentYear },
      },
    },
  });

  if (!user) redirect("/login");

  // =========================================================================
  // 3. FETCH DATA FOR BUDGET MANAGER (Top Section)
  // =========================================================================
  // FIX: We ALWAYS fetch the current month's budget items for the manager.
  // Even in "Yearly" mode, the manager needs the monthly splits to 
  // calculate the projection (Monthly * 12).
  const currentMonthBudgets = await prisma.budget.findMany({
    where: {
      userId: user.id,
      year: currentYear,
      month: currentMonth, 
    },
  });

  const managerBudgets = currentMonthBudgets.map(b => ({
    id: b.id, 
    category: b.category, 
    limit: b.limit 
  }));

  // =========================================================================
  // 4. FETCH DATA FOR ANALYSIS (Bottom Section)
  // =========================================================================
  // FIX: For the analysis charts, we might want the aggregate of the whole year
  // if we are in Yearly view, or just the month if in Monthly view.
  const rawAnalysisBudgets = await prisma.budget.findMany({
    where: {
      userId: user.id,
      year: currentYear,
      // If monthly, strictly filter by month. 
      // If yearly, fetch ALL months to sum them up for "Total Budgeted".
      ...(viewMode === "monthly" ? { month: currentMonth } : {}),
    },
  });

  // Calculate limits for the bottom analysis
const budgetLimits = currentMonthBudgets.reduce((acc, b) => {
    const multiplier = viewMode === "yearly" ? 12 : 1;
    acc[b.category] = b.limit * multiplier;
    return acc;
  }, {} as Record<string, number>);


  // 5. Fetch Spending
  const spending = await prisma.transaction.groupBy({
    by: ["category"],
    where: { 
      userId: session.user.id,
      date: { gte: startDate, lte: endDate }
    },
    _sum: { amount: true },
  });

  // 6. Previous Month Logic
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevBudgetsCount = await prisma.budget.count({
    where: { userId: user.id, month: prevDate.getMonth(), year: prevDate.getFullYear() },
  });

  const activeMonthlyCap = user.monthlyCaps[0]?.amount ?? user.defaultMonthlyBudget ?? 0;
  
  // Smart Yearly Cap Calculation
  const activeYearlyCap = (user.yearlyBudget && user.yearlyBudget > 0)
    ? user.yearlyBudget
    : activeMonthlyCap * 12;

  const currency = user?.currency || "$";

  return (
    <>
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex max-w-max justify-between items-center bg-card/50 backdrop-blur-sm p-2 rounded-2xl border border-border z-50">
                <DateFilter />
            </div>
            
            <div className="my-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {viewMode === "yearly" ? "Yearly Planner" : "Budget Planner"}
                </h1>
                <p className="text-slate-500 mt-2">
                    {viewMode === "yearly" 
                        ? `Overview for the entire year of ${currentYear}`
                        : "Manage your monthly spending limits and category budgets."
                    }
                </p>
            </div>

            <BudgetManager
                viewMode={viewMode}
                monthlyBudget={activeMonthlyCap}
                yearlyBudget={activeYearlyCap}
                budgets={managerBudgets}
                currentMonth={currentMonth}
                currentYear={currentYear}
                currencySymbol={currency}
                canImportPrevious={prevBudgetsCount > 0}
            />
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 pb-20">
            <h1 className="text-2xl font-bold mb-6">
                {viewMode === "yearly" ? "Yearly Spending Analysis" : "Monthly Spending Analysis"}
            </h1>

            <div className="grid md:grid-cols-2 gap-6">
                {spending.map((category) => {
                    const spent = category._sum.amount || 0;
                    const limit = budgetLimits[category.category] || 0; 
                    const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : (spent > 0 ? 100 : 0);
                    const isOver = limit > 0 && spent > limit;

                    return (
                        <div key={category.category} className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg capitalize">{category.category}</h3>
                                    {limit > 0 && (
                                        <p className="text-xs text-slate-400">
                                            {/* Note: In Yearly view, this is "Historical Budget" (sum of all months), not Projected */}
                                            {viewMode === "yearly" ? "Yearly Budget (Sum)" : "Limit"}: {currency}{limit.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <span className={`text-2xl font-bold ${isOver ? "text-red-500" : "text-slate-700 dark:text-slate-200"}`}>
                                    {currency}{spent.toLocaleString()}
                                </span>
                            </div>
                            
                            <div className="w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-red-500" : "bg-indigo-500"}`}
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-right">
                                {limit === 0 
                                    ? "No budget set" 
                                    : isOver 
                                    ? `Over by ${currency}${(spent - limit).toLocaleString()}` 
                                    : `${Math.round(percent)}% used`
                                }
                            </p>
                        </div>
                    );
                })}
            </div>
            
            {spending.length === 0 && (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500">No transactions found for this period.</p>
                </div>
            )}
        </div>
    </>
  );
}