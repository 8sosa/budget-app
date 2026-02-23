// src/app/finances/page.tsx
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { FinancialSummary } from "@/components/ui/FinancialSummary";
import { AccountList } from "@/components/ui/AccountsList";
import { RecentTransactions } from "@/components/ui/RecentTransactions";

export default async function FinancesPage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: { bankAccounts: true }
  });

  if (!user) redirect("/login");

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // 1. Fetch Transactions and the Monthly Budget Cap
  const [transactions, monthlyCap, recentTransactions] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: new Date(currentYear, currentMonth, 1) } }
    }),
    prisma.monthlyCap.findUnique({
      where: { userId_month_year: { userId: user.id, month: currentMonth, year: currentYear } }
    }),
    prisma.transaction.findMany({ 
      where: { userId: user.id }, 
      orderBy: { date: 'desc' }, 
      take: 10 
    })
  ]);

  // 2. Calculate Aggregates
  const totalNetWorth = user.bankAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const inflow = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const outflow = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // 3. Budget Logic
  const totalBudgetLimit = monthlyCap?.amount || 0;
  const remainingBudget = totalBudgetLimit - outflow;
  const isOverBudget = remainingBudget < 0;
  const budgetSpentPercent = totalBudgetLimit > 0 ? Math.min(100, (outflow / totalBudgetLimit) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Finances</h1>
          <p className="text-slate-500 font-medium mt-1">Total Net Worth: ₦{totalNetWorth.toLocaleString()}</p>
        </div>
      </div>

      <FinancialSummary inflow={inflow} outflow={outflow} netWorth={totalNetWorth} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
           <AccountList accounts={user.bankAccounts} />
           <RecentTransactions transactions={recentTransactions} />
        </div>

        {/* Right Column: Budget Progress */}
        <div className="lg:col-span-4 space-y-6">
           <div className={`rounded-[2rem] p-8 text-white relative overflow-hidden transition-colors duration-500 ${isOverBudget ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Monthly Budget</h3>
                <p className="text-white/80 text-sm mb-6">
                  Spent ₦{outflow.toLocaleString()} of ₦{totalBudgetLimit.toLocaleString()}
                </p>
                <div className="text-5xl font-black mb-4">
                  {Math.round(budgetSpentPercent)}%
                </div>
                <div className="w-full bg-black/20 rounded-full h-3">
                   <div 
                     className="bg-white h-full rounded-full transition-all duration-700 ease-out" 
                     style={{ width: `${budgetSpentPercent}%` }} 
                   />
                </div>
                <p className="text-xs mt-4 font-bold uppercase tracking-wider">
                  {isOverBudget 
                    ? `₦${Math.abs(remainingBudget).toLocaleString()} OVER LIMIT` 
                    : `₦${remainingBudget.toLocaleString()} REMAINING`}
                </p>
              </div>
              
              {/* Background Decoration */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
           </div>
        </div>
      </div>
    </div>
  );
}