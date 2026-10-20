"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeCategory } from "@/lib/categories";
import { parseDateOnly } from "@/lib/dates";
import { toNumber } from "@/lib/utils";
import { BANKS } from "@/lib/statements/parse";
import { exchangeCode, getAccount, getTransactions, isMonoEnabled, MonoError, unlinkAccount } from "@/lib/mono";

const DAY = 86400 * 1000;
const FIRST_SYNC_DAYS = 365;
const RESYNC_OVERLAP_DAYS = 7; // banks sometimes post transactions a few days late

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, currency: true },
  });
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/import");
}

const failure = (error: unknown, fallback: string) => {
  if (error instanceof MonoError) return { error: error.message };
  console.error(fallback, error);
  return { error: fallback };
};

// Called with the code from the Mono Connect widget
export async function linkMonoAccount(code: string) {
  if (!isMonoEnabled()) return { error: "Bank linking isn't set up yet" };
  const user = await currentUser();
  if (!user) return { error: "Unauthorized" };
  if (typeof code !== "string" || !code || code.length > 200) return { error: "Invalid code" };

  try {
    const accountId = await exchangeCode(code);
    const account = await getAccount(accountId);

    const existing = await prisma.bankConnection.findUnique({ where: { providerAccountId: accountId } });
    if (existing && existing.userId !== user.id) return { error: "That account is linked to another user" };

    const connection = await prisma.bankConnection.upsert({
      where: { providerAccountId: accountId },
      update: { institution: account.institution, accountName: account.name, accountNumber: account.last4 },
      create: {
        userId: user.id,
        providerAccountId: accountId,
        institution: account.institution,
        accountName: account.name,
        accountNumber: account.last4,
      },
    });

    const synced = await syncConnection(connection.id, user);
    refresh();
    return { success: true, ...synced };
  } catch (error) {
    return failure(error, "Couldn't link that account");
  }
}

export async function syncBankConnection(connectionId: string) {
  if (!isMonoEnabled()) return { error: "Bank linking isn't set up yet" };
  const user = await currentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    const synced = await syncConnection(connectionId, user);
    refresh();
    return { success: true, ...synced };
  } catch (error) {
    return failure(error, "Sync failed");
  }
}

export async function unlinkBankConnection(connectionId: string) {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized" };

  const connection = await prisma.bankConnection.findFirst({ where: { id: connectionId, userId: user.id } });
  if (!connection) return { error: "Account not found" };

  try {
    if (isMonoEnabled()) await unlinkAccount(connection.providerAccountId);
  } catch (error) {
    // Still forget it here; the user can revoke it from Mono too
    console.error("Mono unlink failed:", error);
  }
  // Transactions already synced are kept
  await prisma.bankConnection.delete({ where: { id: connection.id } });
  refresh();
  return { success: true };
}

async function syncConnection(connectionId: string, user: { id: string; currency: string }) {
  const connection = await prisma.bankConnection.findFirst({ where: { id: connectionId, userId: user.id } });
  if (!connection) throw new MonoError("Account not found");

  const end = new Date();
  const start = connection.lastSyncedAt
    ? new Date(connection.lastSyncedAt.getTime() - RESYNC_OVERLAP_DAYS * DAY)
    : new Date(end.getTime() - FIRST_SYNC_DAYS * DAY);

  const transactions = await getTransactions(connection.providerAccountId, start, end);

  // Lines the user already brought in from a statement upload look the same but have
  // different ids. Skip one synced line per statement line with the same day, direction
  // and amount, so the two routes don't double count.
  const fromStatements = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      source: { in: Object.keys(BANKS) },
      date: { gte: new Date(start.getTime() - DAY), lte: new Date(end.getTime() + DAY) },
    },
    select: { date: true, type: true, amount: true },
  });
  const key = (date: string, type: string, amount: number) => `${date}|${type}|${amount.toFixed(2)}`;
  const unmatched = new Map<string, number>();
  for (const t of fromStatements) {
    const k = key(t.date.toISOString().slice(0, 10), t.type, toNumber(t.amount));
    unmatched.set(k, (unmatched.get(k) ?? 0) + 1);
  }

  const data = [];
  for (const tx of transactions) {
    const k = key(tx.date, tx.type, tx.amount);
    const left = unmatched.get(k) ?? 0;
    if (left > 0) {
      unmatched.set(k, left - 1);
      continue;
    }
    const date = parseDateOnly(tx.date);
    if (!date) continue;
    data.push({
      userId: user.id,
      date,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      category: normalizeCategory(tx.category),
      currency: user.currency,
      source: "mono",
      externalId: tx.externalId,
    });
  }

  const { count } = data.length
    ? await prisma.transaction.createMany({ data, skipDuplicates: true })
    : { count: 0 };

  await prisma.bankConnection.update({ where: { id: connection.id }, data: { lastSyncedAt: end } });
  return { imported: count, fetched: transactions.length };
}
