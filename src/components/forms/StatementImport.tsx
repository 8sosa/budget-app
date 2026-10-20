"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { importTransactions, previewStatement } from "@/app/actions/import";
import { BANKS, type Bank, type StatementRow } from "@/lib/statements/parse";
import { parseDateOnly } from "@/lib/dates";

type PreviewRow = StatementRow & { alreadyImported: boolean; selected: boolean };

type Props = {
  categories: string[];
  currencySymbol: string;
};

// Where to find the export in each bank's app, shown under the bank picker
const HINTS: Record<Bank, string> = {
  opay: "In the OPay app: Me → Account Statement (or Transaction History → Download). Pick Excel if offered, otherwise PDF.",
  access: "In AccessMore or Access online banking: Accounts → Statement → choose a date range and download as Excel/CSV or PDF.",
  other: "Any CSV or Excel export with Date, Description and Debit/Credit (or Amount) columns works.",
};

export default function StatementImport({ categories, currencySymbol }: Props) {
  const router = useRouter();
  const [bank, setBank] = useState<Bank>("opay");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isPdf = !!file?.name.toLowerCase().endsWith(".pdf");

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setReading(true);
    setRows(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bank", bank);
    if (password) formData.append("password", password);

    try {
      const result = await previewStatement(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setRows(result.rows.map((r) => ({ ...r, selected: !r.alreadyImported })));
    } catch {
      toast.error("Couldn't read that statement.");
    } finally {
      setReading(false);
    }
  };

  const updateRow = (index: number, change: Partial<PreviewRow>) =>
    setRows((prev) => prev && prev.map((r, i) => (i === index ? { ...r, ...change } : r)));

  const selected = rows?.filter((r) => r.selected) ?? [];
  const totalOut = selected.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount, 0);
  const totalIn = selected.filter((r) => r.type === "income").reduce((sum, r) => sum + r.amount, 0);
  const money = (n: number) => `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const handleImport = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const result = await importTransactions({
        bank,
        rows: selected.map(({ date, description, amount, type, category, externalId }) => ({
          date, description, amount, type, category, externalId,
        })),
      });
      if ("error" in result) {
        toast.error(result.error ?? "Import failed");
        return;
      }
      toast.success(
        `Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"}` +
          (result.skipped ? `, skipped ${result.skipped} already saved` : "")
      );
      setRows(null);
      setFile(null);
      router.push("/transactions");
    } catch {
      toast.error("Import failed");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-6">
      <form
        onSubmit={handlePreview}
        className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bank</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BANKS) as Bank[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBank(b)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  bank === b
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300"
                }`}
              >
                {BANKS[b]}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{HINTS[bank]}</p>
        </div>

        <div>
          <label htmlFor="statement" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Statement file (CSV, Excel .xlsx or PDF, max 5MB)
          </label>
          <input
            id="statement"
            type="file"
            accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setRows(null);
            }}
            className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 dark:file:bg-indigo-500/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-600 dark:file:text-indigo-400"
          />
        </div>

        {isPdf && (
          <div className="space-y-2">
            <label htmlFor="pdf-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              PDF password <span className="font-normal text-slate-400">(if the statement has one)</span>
            </label>
            <input
              id="pdf-password"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PDF pages are read by the same AI service as receipt scanning. CSV and Excel files are read on the server only.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || reading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          {reading ? (isPdf ? "Reading PDF… this can take a minute" : "Reading…") : "Preview transactions"}
        </button>
      </form>

      {rows && (
        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p className="font-semibold text-slate-900 dark:text-white">
                {selected.length} of {rows.length} selected
              </p>
              <p>
                <span className="text-red-600 dark:text-red-400">Out {money(totalOut)}</span>
                {" · "}
                <span className="text-emerald-600 dark:text-emerald-400">In {money(totalIn)}</span>
                {rows.some((r) => r.alreadyImported) && (
                  <span className="text-slate-400"> · {rows.filter((r) => r.alreadyImported).length} already imported</span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={saving || selected.length === 0}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-emerald-700 transition-colors"
            >
              {saving ? "Importing…" : `Import ${selected.length}`}
            </button>
          </div>

          <p className="px-4 sm:px-6 py-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50">
            Untick transfers between your own accounts (e.g. OPay → Access) so they aren&apos;t counted as spending and income twice.
          </p>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, i) => (
              <li
                key={row.externalId}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 ${row.selected ? "" : "opacity-50"}`}
              >
                <label className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => updateRow(i, { selected: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{row.description}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {format(parseDateOnly(row.date) ?? new Date(), "d MMM yyyy")}
                      {row.alreadyImported && " · already imported"}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-3 pl-7 sm:pl-0">
                  <select
                    value={row.category}
                    onChange={(e) => updateRow(i, { category: e.target.value })}
                    className={`${input} sm:w-40 py-1.5`}
                  >
                    {(categories.includes(row.category) ? categories : [row.category, ...categories]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <span
                    className={`w-32 text-right text-sm font-bold whitespace-nowrap ${
                      row.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {row.type === "income" ? "+" : "-"} {money(row.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Imported transactions show up in <Link href="/transactions" className="text-indigo-600 hover:underline">Transactions</Link>.
        Money in is tracked as income and never counts against your budget.
      </p>
    </div>
  );
}
