import prisma from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { normalizeCategory } from "@/lib/categories";

// A month with no budget of its own inherits from the most recent EARLIER month
// that has one. Reading never writes; a month is only saved ("materialized") when
// the user edits it, so browsing to an empty month has no side effects.

type CapRow = { month: number; year: number; amount: number };
type BudgetRow = { id: string; category: string; limit: number; month: number; year: number };

type History = {
  caps: CapRow[];
  budgets: BudgetRow[];
  defaultMonthlyBudget: number;
  yearlyBudget: number;
};

export type ResolvedMonth = {
  globalLimit: number;
  categories: { id: string; category: string; limit: number }[];
  isInherited: boolean;
};

const monthKey = (month: number, year: number) => year * 12 + month;

async function loadHistory(userId: string, upToYear: number): Promise<History> {
  const [user, caps, budgets] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { defaultMonthlyBudget: true, yearlyBudget: true },
    }),
    prisma.monthlyCap.findMany({ where: { userId, year: { lte: upToYear } } }),
    prisma.budget.findMany({ where: { userId, year: { lte: upToYear } } }),
  ]);

  if (!user) throw new Error("User not found");

  return {
    defaultMonthlyBudget: toNumber(user.defaultMonthlyBudget),
    yearlyBudget: toNumber(user.yearlyBudget),
    caps: caps.map((c) => ({ month: c.month, year: c.year, amount: toNumber(c.amount) })),
    budgets: budgets.map((b) => ({
      id: b.id,
      category: normalizeCategory(b.category),
      limit: toNumber(b.limit),
      month: b.month,
      year: b.year,
    })),
  };
}

function resolveMonth(history: History, month: number, year: number): ResolvedMonth {
  const target = monthKey(month, year);

  // Latest cap at or before the target month
  let cap: CapRow | undefined;
  for (const c of history.caps) {
    const k = monthKey(c.month, c.year);
    if (k <= target && (!cap || k > monthKey(cap.month, cap.year))) cap = c;
  }

  // Latest month at or before the target that has any budget data (a cap or categories)
  let sourceKey = -1;
  for (const row of [...history.caps, ...history.budgets]) {
    const k = monthKey(row.month, row.year);
    if (k <= target && k > sourceKey) sourceKey = k;
  }

  const categories = history.budgets
    .filter((b) => monthKey(b.month, b.year) === sourceKey)
    .map(({ id, category, limit }) => ({ id, category, limit }));

  return {
    globalLimit: cap ? cap.amount : history.defaultMonthlyBudget,
    categories,
    isInherited: sourceKey !== target,
  };
}

export async function getBudgetForPeriod(userId: string, month: number, year: number) {
  const history = await loadHistory(userId, year);
  return resolveMonth(history, month, year);
}

// Yearly figures, computed the same way everywhere:
// - yearlyLimit: the user's own yearly budget if set, else the sum of each month's cap
// - categoryLimits: each category's limit summed over the 12 months
export async function getYearlyLimits(userId: string, year: number) {
  const history = await loadHistory(userId, year);

  let monthlyCapSum = 0;
  const categoryLimits: Record<string, number> = {};

  for (let m = 0; m < 12; m++) {
    const resolved = resolveMonth(history, m, year);
    monthlyCapSum += resolved.globalLimit;
    for (const c of resolved.categories) {
      categoryLimits[c.category] = (categoryLimits[c.category] || 0) + c.limit;
    }
  }

  return {
    yearlyLimit: history.yearlyBudget > 0 ? history.yearlyBudget : monthlyCapSum,
    monthlyCapSum,
    categoryLimits,
  };
}

// Save the inherited budget into the month itself, so an edit to one category
// doesn't make the month's other inherited categories disappear.
export async function materializeMonth(userId: string, month: number, year: number) {
  const [ownCap, ownBudgets] = await Promise.all([
    prisma.monthlyCap.count({ where: { userId, month, year } }),
    prisma.budget.count({ where: { userId, month, year } }),
  ]);
  if (ownCap > 0 || ownBudgets > 0) return;

  const resolved = await getBudgetForPeriod(userId, month, year);

  await prisma.$transaction([
    prisma.monthlyCap.upsert({
      where: { userId_month_year: { userId, month, year } },
      update: {},
      create: { userId, month, year, amount: resolved.globalLimit },
    }),
    prisma.budget.createMany({
      data: resolved.categories.map((c) => ({
        userId,
        category: c.category,
        limit: c.limit,
        month,
        year,
      })),
      skipDuplicates: true,
    }),
  ]);
}
