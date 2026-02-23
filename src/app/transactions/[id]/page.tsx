import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { TransactionEditForm } from "@/components/forms/TransactionEditForm";
import { ReceiptModal } from "@/components/ui/ReceiptModal";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TransactionDetailsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  
  const user = session?.user as { id: string; name?: string; email?: string; image?: string } | undefined;

  if (!user) redirect("/login");

  const userBudgets = await prisma.budget.findMany({
    where: { userId: user.id },
    select: { category: true },
  });

  const customCategories = Array.from(new Set(userBudgets.map(b => b.category)));
  if (!customCategories.includes("Uncategorized")) customCategories.push("Uncategorized");
  
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });

  if (!transaction) notFound();

  if (transaction.userId !== user.id) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currency: true }
  });
  
  const currency = dbUser?.currency || "₦";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link 
        href="/transactions" 
        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to List
      </Link>

      <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            
            {/* ✅ Integration: Passing the transaction data to the Edit Form */}
            <div className="flex-1 w-full">
              <TransactionEditForm transaction={transaction} availableCategories={customCategories} />
            </div>

            <div className="text-right min-w-fit self-end md:self-start">
              <span className={`block text-3xl font-bold ${transaction.amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {transaction.amount < 0 ? '-' : '+'}{currency}{Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                {format(new Date(transaction.date), "PPP")}
              </p>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-8">
          {/* Receipt Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span>🧾</span> Receipt / Attachment
            </h3>
            
            {transaction.receiptUrl ? (
              <ReceiptModal url={transaction.receiptUrl} />
            ) : (
              <div className="w-full py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm">No receipt attached.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-slate-400 uppercase">Transaction ID: {transaction.id}</span>
                <span className="text-xs text-slate-400 italic font-light">
                   Last synced: {format(new Date(), "p")}
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}