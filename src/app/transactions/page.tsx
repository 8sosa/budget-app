import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TransactionItem from "@/components/ui/TransactionItem";
import Link from "next/link";
import CategoryFilter from "@/components/ui/CategoryFilter";
import DateFilter from "@/components/ui/DateFilter";

type Props = {
  searchParams: Promise<{ 
    category?: string;
    month?: string;
    year?: string;
    view?: string; // 1. Add 'view' to props
  }>;
};

export default async function TransactionsPage(props: Props) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  
  if (!session?.user) redirect("/login");

  const now = new Date();
  const currentMonth = searchParams.month ? parseInt(searchParams.month) : now.getMonth();
  const currentYear = searchParams.year ? parseInt(searchParams.year) : now.getFullYear();
  const viewMode = searchParams.view || "monthly"; // 2. Default to monthly

  // 3. Dynamic Date Logic
  let startDate, endDate;
  let dateLabel;

  if (viewMode === "yearly") {
    // YEARLY: Jan 1st to Dec 31st of selected year
    startDate = new Date(currentYear, 0, 1);
    endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    dateLabel = `${currentYear}`;
  } else {
    // MONTHLY: 1st to Last day of selected month
    startDate = new Date(currentYear, currentMonth, 1);
    endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    dateLabel = `${startDate.toLocaleString('default', { month: 'long' })} ${currentYear}`;
  }

  const categoryFilter = searchParams.category;

  const uniqueCategories = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId: session.user.id },
  });
  const categoryList = uniqueCategories.map(c => c.category);

  const transactions = await prisma.transaction.findMany({
    where: { 
      userId: session.user.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
      ...(categoryFilter ? { 
        category: {
            equals: categoryFilter,
            mode: 'insensitive',
        }
      } : {}),
    },
    orderBy: { date: 'desc' },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true }
  });

  const currency = user?.currency || "$";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Section */}
      <div className="flex flex-col gap-6 mb-8">
        
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transaction History</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {/* 4. Update the label dynamically */}
                    Showing records for <span className="font-semibold text-indigo-600">{dateLabel}</span>
                </p>
            </div>
            <Link 
              href="/dashboard"
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              Back
            </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <DateFilter />
            <div className="w-full sm:w-auto">
                <CategoryFilter categories={categoryList} />
            </div>
        </div>
      </div>

      <div className="space-y-3">
        {transactions.length > 0 ? (
          transactions.map((t) => (
            <TransactionItem
              key={t.id}
              id={t.id}
              description={t.description || "Unknown"}
              amount={t.amount}
              date={t.date}
              category={t.category}
              currency={currency}
              hasReceipt={!!t.receiptUrl}
            />
          ))
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
             <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
             </div>
             <h3 className="text-lg font-medium text-slate-900 dark:text-white">No transactions found</h3>
             <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                {categoryFilter 
                    ? `We couldn't find any "${categoryFilter}" transactions in ${dateLabel}.` 
                    : `You haven't added any transactions for ${dateLabel} yet.`
                }
             </p>
             
             {!categoryFilter && (
                <Link href="/dashboard" className="text-indigo-600 font-medium mt-4 inline-block hover:underline">
                    Create your first transaction
                </Link>
             )}
          </div>
        )}
      </div>
    </div>
  );
}