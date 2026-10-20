"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeCategory } from "@/lib/categories";
import { parseDateOnly } from "@/lib/dates";
import { BANKS, parseStatementRows, StatementError, type Bank, type StatementRow } from "@/lib/statements/parse";
import { readStatementRows } from "@/lib/statements/read";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, currency: true },
  });
}

export type PreviewResult =
  | { error: string }
  | { rows: (StatementRow & { alreadyImported: boolean })[] };

// Reads a statement and returns its transactions without saving anything.
export async function previewStatement(formData: FormData): Promise<PreviewResult> {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized" };

  const file = formData.get("file");
  const bank = String(formData.get("bank") ?? "");
  const password = String(formData.get("password") ?? "") || undefined;

  if (!(file instanceof File) || file.size === 0) return { error: "Choose a statement file" };
  if (file.size > MAX_BYTES) return { error: "Statement must be 5MB or smaller" };
  if (!(bank in BANKS)) return { error: "Choose which bank the statement is from" };

  try {
    const rows = parseStatementRows(await readStatementRows(file, password), bank as Bank).slice(0, MAX_ROWS);
    if (rows.length === 0) return { error: "No transactions found in that statement." };

    const existing = await prisma.transaction.findMany({
      where: { userId: user.id, externalId: { in: rows.map((r) => r.externalId) } },
      select: { externalId: true },
    });
    const imported = new Set(existing.map((t) => t.externalId));

    return { rows: rows.map((r) => ({ ...r, alreadyImported: imported.has(r.externalId) })) };
  } catch (error) {
    if (error instanceof StatementError) return { error: error.message };
    console.error("Statement preview failed:", error);
    return { error: "Couldn't read that statement." };
  }
}

const ImportSchema = z.object({
  bank: z.enum(Object.keys(BANKS) as [Bank, ...Bank[]]),
  rows: z
    .array(
      z.object({
        date: z.string(),
        description: z.string().trim().min(1).max(200),
        amount: z.number().positive().max(1e12),
        type: z.enum(["expense", "income"]),
        category: z.string().max(60),
        externalId: z.string().min(1).max(100),
      })
    )
    .min(1)
    .max(MAX_ROWS),
});

export async function importTransactions(input: z.input<typeof ImportSchema>) {
  const user = await currentUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = ImportSchema.safeParse(input);
  if (!parsed.success) return { error: "Some rows are invalid. Upload the statement again." };
  const { bank, rows } = parsed.data;

  const data = [];
  for (const row of rows) {
    const date = parseDateOnly(row.date);
    if (!date) return { error: `Invalid date on "${row.description}"` };
    data.push({
      userId: user.id,
      date,
      amount: row.amount,
      type: row.type,
      description: row.description,
      category: normalizeCategory(row.category),
      currency: user.currency,
      source: bank,
      externalId: row.externalId,
    });
  }

  try {
    // Lines already imported hit the (userId, externalId) unique index and are skipped
    const { count } = await prisma.transaction.createMany({ data, skipDuplicates: true });

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/budget");
    return { imported: count, skipped: data.length - count };
  } catch (error) {
    console.error("Statement import failed:", error);
    return { error: "Failed to import transactions" };
  }
}
