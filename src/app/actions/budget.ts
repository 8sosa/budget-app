"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { materializeMonth } from "@/lib/budgetUtils";
import { normalizeCategory } from "@/lib/categories";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");
  return user.id;
}

function requireAmount(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Amount must be zero or more");
}

function revalidateBudgetPages() {
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

// 1. Update Global Limits (Total Monthly/Yearly Cap)
export async function updateGlobalBudget(amount: number, type: "monthly" | "yearly", month?: number, year?: number) {
  const userId = await requireUserId();
  requireAmount(amount);

  if (type === "yearly") {
    await prisma.user.update({
      where: { id: userId },
      data: { yearlyBudget: amount },
    });
  } else {
    if (month === undefined || year === undefined) throw new Error("Month/Year required");

    await materializeMonth(userId, month, year);
    await prisma.monthlyCap.upsert({
      where: { userId_month_year: { userId, month, year } },
      update: { amount },
      create: { userId, month, year, amount },
    });
  }

  revalidateBudgetPages();
}

// 2. Save or Update a Specific Category
export async function saveCategoryBudget(category: string, limit: number, month: number, year: number) {
  const userId = await requireUserId();
  requireAmount(limit);
  const name = normalizeCategory(category);

  await materializeMonth(userId, month, year);
  await prisma.budget.upsert({
    where: { userId_category_month_year: { userId, category: name, month, year } },
    update: { limit },
    create: { userId, category: name, limit, month, year },
  });

  revalidateBudgetPages();
}

// 3. Delete a Category from one month (only the signed-in user's)
export async function deleteBudget(category: string, month: number, year: number) {
  const userId = await requireUserId();

  await materializeMonth(userId, month, year);
  await prisma.budget.deleteMany({
    where: { userId, category: normalizeCategory(category), month, year },
  });

  revalidateBudgetPages();
}

// 4. Import Budgets from Previous Month
export async function copyPreviousMonthBudgets(currentMonth: number, currentYear: number) {
  const userId = await requireUserId();

  // Calculate Previous Month (Handling January rollback)
  const targetDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = targetDate.getMonth();
  const prevYear = targetDate.getFullYear();

  const previousBudgets = await prisma.budget.findMany({
    where: { userId, month: prevMonth, year: prevYear },
  });

  if (previousBudgets.length === 0) {
    return { success: false, message: "No budgets found in previous month." };
  }

  // Existing categories in the current month are kept as they are
  const result = await prisma.budget.createMany({
    data: previousBudgets.map((b) => ({
      userId,
      category: normalizeCategory(b.category),
      limit: b.limit,
      month: currentMonth,
      year: currentYear,
    })),
    skipDuplicates: true,
  });

  revalidateBudgetPages();
  return { success: true, count: result.count };
}
