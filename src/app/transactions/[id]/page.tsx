import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

// ✅ FIX 1: Update type to be a Promise
type Props = {
  params: Promise<{ id: string }>;
};

export default async function TransactionDetailsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  
  // Safe cast for user ID (fixes previous typescript error)
  const user = session?.user as { id: string; name?: string; email?: string; image?: string } | undefined;

  if (!user) redirect("/login");

  // ✅ FIX 2: Await the params before accessing properties
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id }, // Now using the awaited 'id'
  });

  if (!transaction) notFound();

  // Security check
  if (transaction.userId !== user.id) {
    return <div className="p-8 text-center text-red-500">Access Denied</div>;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { currency: true }
  });
  
  const currency = dbUser?.currency || "$";

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
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                {transaction.category}
              </p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {transaction.description || "Transaction Details"}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {format(new Date(transaction.date), "PPP 'at' p")}
              </p>
            </div>
            <div className="text-right">
              <span className="block text-3xl font-bold text-slate-900 dark:text-white">
                {currency}{transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Receipt Section */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-200 mb-3 flex items-center gap-2">
              <span>🧾</span> Receipt / Attachment
            </h3>
            
            {transaction.receiptUrl ? (
              <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                <img 
                  src={transaction.receiptUrl} 
                  alt="Receipt" 
                  className="w-full h-auto object-contain max-h-[500px]" 
                />
                <a 
                  href={transaction.receiptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute bottom-4 right-4 bg-white/90 backdrop-blur text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm hover:bg-white transition-colors"
                >
                  Open Original ↗
                </a>
              </div>
            ) : (
              <div className="w-full py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No receipt attached to this transaction.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
             <div className="flex gap-2">
                <span className="text-xs font-mono text-slate-400">ID: {transaction.id}</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}