"use client";

import { deleteTransaction } from "@/app/actions/transaction";
import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: string;
  currency: string;
  hasReceipt?: boolean; // New prop to show receipt icon
};

const getCategoryStyle = (cat: string) => {
  const normalized = cat.toLowerCase();
  
  if (normalized.includes("food") || normalized.includes("grocer") || normalized.includes("restaurant")) {
    return { wrapper: "bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 ring-orange-500/20", icon: "🍔" };
  }
  if (normalized.includes("transport") || normalized.includes("gas") || normalized.includes("uber")) {
    return { wrapper: "bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 ring-blue-500/20", icon: "🚗" };
  }
  if (normalized.includes("bill") || normalized.includes("utilit")) {
    return { wrapper: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 ring-red-500/20", icon: "💡" };
  }
  if (normalized.includes("shopping") || normalized.includes("cloth")) {
    return { wrapper: "bg-pink-100 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 ring-pink-500/20", icon: "🛍️" };
  }
  if (normalized.includes("enter") || normalized.includes("fun")) {
    return { wrapper: "bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 ring-purple-500/20", icon: "🎬" };
  }
  return { wrapper: "bg-slate-100 text-slate-600 dark:bg-indigo-500/10 dark:text-indigo-400 ring-slate-500/20", icon: "💳" };
};

export default function TransactionItem({ id, description, amount, date, category, currency, hasReceipt }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const style = getCategoryStyle(category || "other");

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop click from bubbling to the parent div
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    setIsDeleting(true);
    await deleteTransaction(id);
  };

  const handleClick = () => {
    if (!isDeleting) {
        router.push(`/transactions/${id}`);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        group relative flex items-center justify-between 
        p-3 sm:p-4 mb-2 cursor-pointer
        bg-white dark:bg-slate-900
        rounded-2xl border border-slate-100 dark:border-slate-800
        hover:border-indigo-200 dark:hover:border-indigo-800
        hover:shadow-md dark:hover:bg-slate-800/50
        transition-all duration-200 ease-in-out
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {/* CATEGORY AVATAR */}
        <div className={`
          shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center 
          text-lg sm:text-xl ring-1 ring-inset transition-colors relative
          ${style.wrapper}
        `}>
           {style.icon}
           {/* Tiny Receipt Badge if receipt exists */}
           {hasReceipt && (
             <span className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 text-[10px] p-0.5 rounded-full border shadow-sm" title="Receipt Attached">
               🧾
             </span>
           )}
        </div>
        
        {/* TEXT INFO */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate text-sm sm:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {description || "Unknown Transaction"}
          </p>
          <div className="flex items-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 gap-1.5">
             <span className="shrink-0">{format(new Date(date), "d MMM")}</span>
             <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
             <span className="capitalize truncate">{category}</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Amount & Delete */}
      <div className="flex items-center gap-3 sm:gap-5 ml-2 sm:ml-4">
        <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
          - {currency}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>

        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="
            z-10 p-2 rounded-lg 
            text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            opacity-100 sm:opacity-0 sm:group-hover:opacity-100 
            transition-all duration-200 
            sm:translate-x-2 sm:group-hover:translate-x-0
          "
          title="Delete Transaction"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}