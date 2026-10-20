import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import BudgetManager from "@/components/forms/BudgetManager";
import DateFilter from "@/components/ui/DateFilter";
import { getBudgetForPeriod, getYearlyLimits } from "@/lib/budgetUtils";
import { normalizeCategory } from "@/lib/categories";
import { periodRange } from "@/lib/dates";
import { toNumber } from "@/lib/utils";

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

  // 1. Date Range for SPENDING (UTC, matching how transaction dates are stored)
  const range = periodRange(viewMode, currentMonth, currentYear);

  // 2. Fetch User
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, currency: true },
  });

  if (!user) redirect("/login");

  // 3. Budget for the selected month (inherited from earlier months if it has none of its own)
  const monthBudget = await getBudgetForPeriod(user.id, currentMonth, currentYear);
  const yearly = await getYearlyLimits(user.id, currentYear);

  // Manager list: the month's categories, or each category summed over the year
  const managerBudgets = viewMode === "yearly"
    ? Object.entries(yearly.categoryLimits).map(([category, limit]) => ({ id: category, category, limit }))
    : monthBudget.categories;

  // 4. Limits for the analysis cards (same figures as the manager and the dashboard)
  const budgetLimits: Record<string, number> = {};
  for (const b of managerBudgets) budgetLimits[b.category] = b.limit;

  // 5. Fetch Spending, merged by normalized category name
  const spendingRows = await prisma.transaction.groupBy({
    by: ["category"],
    where: { 
      userId: user.id,
      type: "expense",
      date: range,
    },
    _sum: { amount: true },
  });

  const spentByCategory: Record<string, number> = {};
  for (const row of spendingRows) {
    const cat = normalizeCategory(row.category);
    spentByCategory[cat] = (spentByCategory[cat] || 0) + toNumber(row._sum.amount);
  }
  const spending = Object.entries(spentByCategory).map(([category, spent]) => ({ category, spent }));

  // 6. Previous Month Logic
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevBudgetsCount = await prisma.budget.count({
    where: { userId: user.id, month: prevDate.getMonth(), year: prevDate.getFullYear() },
  });

  const activeMonthlyCap = monthBudget.globalLimit;
  const activeYearlyCap = yearly.yearlyLimit;

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
                budgets={managerBudgets} // <--- Now passes data even in Yearly mode
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
                    const spent = category.spent;
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
                                            {viewMode === "yearly" ? "Yearly Budget" : "Limit"}: {currency}{limit.toLocaleString()}
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