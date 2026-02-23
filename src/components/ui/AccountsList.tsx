// src/components/ui/AccountsList.tsx
"use client";

import { syncBankBalance } from "@/app/actions/mono";
import { useState } from "react";
import { AddBankButton } from "./AddBankButton";

export function AccountList({ accounts }: { accounts: any[] }) {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  async function handleSync(id: string, monoId: string) {
    setSyncingId(id);
    await syncBankBalance(id, monoId);
    setSyncingId(null);
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center">
        <h3 className="font-bold text-white">Bank Accounts</h3>
        <AddBankButton />
      </div>
      
      <div className="divide-y divide-slate-800">
        {accounts.map((bank) => (
          <div key={bank.id} className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl">
                🏦
              </div>
              <div>
                <p className="font-bold text-white">{bank.institutionName}</p>
                <p className="text-xs text-slate-500 uppercase tracking-tighter">
                  Synced {new Date(bank.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xl font-black text-white">
                ₦{bank.balance.toLocaleString()}
              </p>
              <button 
                onClick={() => handleSync(bank.id, bank.monoAccountId)}
                disabled={syncingId === bank.id}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 flex items-center gap-1 justify-end ml-auto mt-1"
              >
                <svg className={`w-3 h-3 ${syncingId === bank.id ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {syncingId === bank.id ? "SYNCING..." : "REFRESH"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}