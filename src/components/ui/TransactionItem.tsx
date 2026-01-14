"use client";

import { deleteTransaction } from "@/app/actions/transaction";
import { useState } from "react";

type Props = {
  id: string;
  description: string;
  amount: number;
  date: Date;
  category: string;
};

const getCategoryStyle = (cat: string) => {
  const normalized = cat.toLowerCase();
  
  if (normalized.includes("food") || normalized.includes("grocer") || normalized.includes("restaurant")) {
    return { bg: "bg-orange-100", text: "text-orange-600", icon: "🍔" };
  }
  if (normalized.includes("transport") || normalized.includes("gas") || normalized.includes("uber")) {
    return { bg: "bg-blue-100", text: "text-blue-600", icon: "🚗" };
  }
  if (normalized.includes("bill") || normalized.includes("utilit")) {
    return { bg: "bg-red-100", text: "text-red-600", icon: "💡" };
  }
  if (normalized.includes("shopping") || normalized.includes("cloth")) {
    return { bg: "bg-pink-100", text: "text-pink-600", icon: "🛍️" };
  }
  if (normalized.includes("enter") || normalized.includes("fun")) {
    return { bg: "bg-purple-100", text: "text-purple-600", icon: "🎬" };
  }
  
  return { bg: "bg-slate-100", text: "text-slate-600", icon: "💳" };
};

export default function TransactionItem({ id, description, amount, date, category }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const style = getCategoryStyle(category || "other");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    setIsDeleting(true);
    await deleteTransaction(id);
  };

  return (
    <div 
      className={`
        group relative flex items-center justify-between 
        p-3 sm:p-4 
        rounded-xl border border-transparent 
        hover:bg-white hover:shadow-sm hover:border-slate-100 
        transition-all duration-200 ease-in-out
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        {/* 1. CATEGORY AVATAR */}
        <div className={`
          shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
          text-lg ${style.bg} ${style.text} shadow-sm
        `}>
            {style.icon}
        </div>
        
        {/* 2. TEXT INFO */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-700 leading-tight truncate text-sm sm:text-base">
            {description || "Unknown Transaction"}
          </p>
          <div className="flex items-center text-xs text-slate-400 mt-0.5 sm:mt-1 gap-1 sm:gap-2">
             <span className="shrink-0">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
             <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
             <span className="capitalize truncate">{category}</span>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDE: Amount & Delete */}
      <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-4">
        <span className="font-bold text-slate-900 text-sm sm:text-base whitespace-nowrap">
          - #{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>

        {/* Delete Button */}
        <button 
          onClick={handleDelete}
          disabled={isDeleting}
          className="
            p-2 rounded-lg text-slate-400 
            hover:text-red-600 hover:bg-red-50 
            opacity-100 sm:opacity-0 sm:group-hover:opacity-100 
            transition-all duration-200 
            sm:translate-x-2 sm:group-hover:translate-x-0
          "
          title="Delete Transaction"
          aria-label="Delete transaction"
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