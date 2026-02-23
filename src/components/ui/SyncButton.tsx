// src/components/SyncButton.tsx
"use client"

import { useState } from "react";
import { syncBankBalance } from "@/app/actions/mono";

export function SyncButton({ id, monoId }: { id: string, monoId: string }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncBankBalance(id, monoId);
    setIsSyncing(false);
  };

  return (
    <button 
      onClick={handleSync}
      disabled={isSyncing}
      className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
    >
      <svg 
        className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} 
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {isSyncing ? "SYNCING..." : "REFRESH BALANCE"}
    </button>
  );
}