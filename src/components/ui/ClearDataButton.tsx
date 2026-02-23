"use client";

import { clearUserTransactions } from "@/app/actions/transaction";
import { useState } from "react";

export function ClearDataButton() {
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (!confirm("Are you sure? This will permanently delete ALL transactions.")) return;
    
    setLoading(true);
    const res = await clearUserTransactions();
    
    if (res.success) {
      alert(`Success! Deleted ${res.count} transactions.`);
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleClear}
      disabled={loading}
      className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
    >
      {loading ? "CLEARING..." : "RESET ALL TRANSACTIONS"}
    </button>
  );
}