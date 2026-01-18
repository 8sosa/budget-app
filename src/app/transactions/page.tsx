import { authOptions } from "@/lib/auth"; // Adjust path
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import TransactionItem from "@/components/ui/TransactionItem"; // Adjust path
import Link from "next/link";

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Fetch all transactions, sorted by newest
  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: 'desc' },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { currency: true }
  });

  const currency = user?.currency || "$";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">All Transactions</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
             Manage and review your spending history
          </p>
        </div>
        <Link 
          href="/dashboard"
          className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* List */}
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
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
             <p className="text-slate-500">No transactions found yet.</p>
             <Link href="/dashboard" className="text-indigo-600 font-medium mt-2 inline-block hover:underline">
               Go create one!
             </Link>
          </div>
        )}
      </div>
    </div>
  );
}