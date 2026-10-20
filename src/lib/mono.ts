// Server only: Mono open-banking API (https://docs.mono.co), v2.
// Off unless MONO_SECRET_KEY and NEXT_PUBLIC_MONO_PUBLIC_KEY are set.

import { categorize } from "@/lib/statements/categorize";
import type { TransactionType } from "@/lib/statements/parse";

const API = "https://api.withmono.com";
const MAX_PAGES = 50;

export function isMonoEnabled() {
  return !!process.env.MONO_SECRET_KEY && !!process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;
}

export class MonoError extends Error {}

async function mono<T>(pathOrUrl: string, init: RequestInit = {}): Promise<T> {
  const url = pathOrUrl.startsWith("https://") ? pathOrUrl : `${API}${pathOrUrl}`;
  // Pagination links come from the response; never send the secret key anywhere else
  if (new URL(url).origin !== API) throw new MonoError("Unexpected Mono URL");

  const res = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "mono-sec-key": process.env.MONO_SECRET_KEY ?? "",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Mono request failed:", res.status, body?.message);
    throw new MonoError(body?.message || `Mono request failed (${res.status})`);
  }
  return body as T;
}

// The one-time code from the Connect widget (valid ~10 minutes) -> permanent account id
export async function exchangeCode(code: string): Promise<string> {
  const body = await mono<{ data?: { id?: string } }>("/v2/accounts/auth", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  if (!body.data?.id) throw new MonoError("Mono didn't return an account id");
  return body.data.id;
}

export type MonoAccount = { institution: string | null; name: string | null; last4: string | null };

export async function getAccount(accountId: string): Promise<MonoAccount> {
  const body = await mono<{
    data?: { account?: { name?: string; account_number?: string; institution?: { name?: string } } };
  }>(`/v2/accounts/${encodeURIComponent(accountId)}`);
  const account = body.data?.account;
  return {
    institution: account?.institution?.name ?? null,
    name: account?.name ?? null,
    last4: account?.account_number ? account.account_number.slice(-4) : null,
  };
}

export async function unlinkAccount(accountId: string) {
  await mono(`/v2/accounts/${encodeURIComponent(accountId)}/unlink`, { method: "POST" });
}

type MonoTransaction = {
  id: string;
  narration?: string;
  amount: number; // kobo
  type: "debit" | "credit";
  date: string; // ISO timestamp
};

export type SyncedTransaction = {
  date: string; // YYYY-MM-DD, Lagos calendar day
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  externalId: string;
};

// Mono wants DD-MM-YYYY
const monoDate = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;

// The calendar day the transaction happened on in Nigeria (UTC+1, no DST)
const lagosDay = (iso: string) => new Date(new Date(iso).getTime() + 3600 * 1000).toISOString().slice(0, 10);

export function toSyncedTransaction(tx: MonoTransaction): SyncedTransaction | null {
  const amount = Math.round(Math.abs(tx.amount)) / 100;
  if (!tx.id || !amount || isNaN(new Date(tx.date).getTime())) return null;
  const type: TransactionType = tx.type === "credit" ? "income" : "expense";
  const description = (tx.narration ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || "Bank transaction";
  return {
    date: lagosDay(tx.date),
    description,
    amount,
    type,
    category: categorize(description, type),
    externalId: `mono:${tx.id}`,
  };
}

export async function getTransactions(accountId: string, start: Date, end: Date): Promise<SyncedTransaction[]> {
  const result: SyncedTransaction[] = [];
  let next: string | null =
    `/v2/accounts/${encodeURIComponent(accountId)}/transactions?start=${monoDate(start)}&end=${monoDate(end)}&paginate=true`;

  for (let page = 0; next && page < MAX_PAGES; page++) {
    const body: { data?: MonoTransaction[]; meta?: { next?: string | null } } = await mono(next);
    for (const tx of body.data ?? []) {
      const synced = toSyncedTransaction(tx);
      if (synced) result.push(synced);
    }
    next = body.meta?.next || null;
  }
  return result;
}
