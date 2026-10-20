"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { linkMonoAccount, syncBankConnection, unlinkBankConnection } from "@/app/actions/mono";

type Connection = {
  id: string;
  institution: string | null;
  accountName: string | null;
  accountNumber: string | null;
  lastSyncedAt: Date | null;
};

type Props = {
  publicKey: string | null; // null until Mono is configured
  connections: Connection[];
  customer: { name: string; email: string };
};

const synced = (r: { imported: number; fetched: number }) =>
  r.imported > 0 ? `Added ${r.imported} new transaction${r.imported === 1 ? "" : "s"}` : "Already up to date";

export default function BankConnections({ publicKey, connections, customer }: Props) {
  const router = useRouter();
  const enabled = !!publicKey;
  const [busy, setBusy] = useState<string | null>(null);

  const link = async () => {
    setBusy("link");
    try {
      const MonoConnect = (await import("@mono.co/connect.js")).default;
      const widget = new MonoConnect({
        key: publicKey!,
        scope: "auth",
        data: { customer },
        onClose: () => setBusy(null),
        onSuccess: async ({ code }: { code: string }) => {
          setBusy("link");
          const result = await linkMonoAccount(code);
          setBusy(null);
          if ("error" in result) toast.error(result.error ?? "Couldn't link that account");
          else {
            toast.success(`Account linked. ${synced(result)}`);
            router.refresh();
          }
        },
      });
      widget.setup();
      widget.open();
    } catch {
      setBusy(null);
      toast.error("Couldn't open Mono");
    }
  };

  const sync = async (id: string) => {
    setBusy(id);
    const result = await syncBankConnection(id);
    setBusy(null);
    if ("error" in result) toast.error(result.error ?? "Sync failed");
    else {
      toast.success(synced(result));
      router.refresh();
    }
  };

  const unlink = async (id: string) => {
    if (!confirm("Unlink this account? Transactions already synced are kept.")) return;
    setBusy(id);
    const result = await unlinkBankConnection(id);
    setBusy(null);
    if ("error" in result) toast.error(result.error ?? "Couldn't unlink");
    else router.refresh();
  };

  return (
    <section className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Linked bank accounts</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {enabled
              ? "Link OPay, Access Bank and others through Mono to pull in transactions without uploading statements."
              : "Live bank sync through Mono turns on once the Mono API keys are added. Statement upload below works today."}
          </p>
        </div>
        {enabled && (
          <button
            type="button"
            onClick={link}
            disabled={busy !== null}
            className="shrink-0 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {busy === "link" ? "Linking…" : "Link a bank account"}
          </button>
        )}
      </div>

      {connections.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {connections.map((c) => (
            <li key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {c.institution || "Bank account"}
                  {c.accountNumber && <span className="text-slate-400"> ···{c.accountNumber}</span>}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {c.accountName && `${c.accountName} · `}
                  {c.lastSyncedAt ? `Synced ${formatDistanceToNow(new Date(c.lastSyncedAt), { addSuffix: true })}` : "Not synced yet"}
                </p>
              </div>
              <div className="flex gap-2">
                {enabled && (
                  <button
                    type="button"
                    onClick={() => sync(c.id)}
                    disabled={busy !== null}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300 disabled:opacity-50"
                  >
                    {busy === c.id ? "Syncing…" : "Sync now"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => unlink(c.id)}
                  disabled={busy !== null}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                >
                  Unlink
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
