"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. Update Global Limits (Total Monthly/Yearly Cap)
export async function updateGlobalBudget(amount: number, type: "monthly" | "yearly", month?: number, year?: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email }});
  if (!user) throw new Error("User not found");

  if (type === "yearly") {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { yearlyBudget: amount },
    });
  } else {
    if (month === undefined || year === undefined) throw new Error("Month/Year required");

    await prisma.monthlyCap.upsert({
      where: { 
        userId_month_year: { userId: user.id, month, year } 
      },
      update: { amount },
      create: { 
        userId: user.id,
        month,
        year,
        amount 
      }
    });
  }

  revalidatePath("/dashboard");
}

// 2. Save or Update a Specific Category (Prevents Duplicates)
export async function saveCategoryBudget(category: string, limit: number, month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email }});
  if (!user) throw new Error("User not found");

  // Step A: Check if this category ALREADY exists for this month/year
  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId: user.id,
      category: category,
      month: month,
      year: year,
    },
  });

  if (existingBudget) {
    // Step B: Update existing
    await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { limit: limit },
    });
  } else {
    // Step C: Create new
    await prisma.budget.create({
      data: {
        userId: user.id,
        category,
        limit,
        month,
        year
      }
    });
  }

  revalidatePath("/dashboard");
}

// 3. Delete a Category
export async function deleteBudget(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  await prisma.budget.delete({ where: { id } });
  revalidatePath("/dashboard");
}

// 4. NEW: Import Budgets from Previous Month
export async function copyPreviousMonthBudgets(currentMonth: number, currentYear: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) throw new Error("User not found");

  // Calculate Previous Month (Handling January rollback)
  const targetDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = targetDate.getMonth();
  const prevYear = targetDate.getFullYear();

  // Fetch Previous Budgets
  const previousBudgets = await prisma.budget.findMany({
    where: {
      userId: user.id,
      month: prevMonth,
      year: prevYear,
    },
  });

  if (previousBudgets.length === 0) {
    return { success: false, message: "No budgets found in previous month." };
  }

  // Check what currently exists to avoid duplicates
  const currentBudgets = await prisma.budget.findMany({
    where: { userId: user.id, month: currentMonth, year: currentYear },
    select: { category: true },
  });

  const existingCategories = new Set(currentBudgets.map((b) => b.category));

  // Filter: Only copy items that DON'T exist in the current month
  const budgetsToCreate = previousBudgets
    .filter((b) => !existingCategories.has(b.category))
    .map((b) => ({
      userId: user.id,
      category: b.category,
      limit: b.limit,
      month: currentMonth,
      year: currentYear,
    }));

  if (budgetsToCreate.length > 0) {
    await prisma.budget.createMany({
      data: budgetsToCreate,
    });
  }

  revalidatePath("/dashboard");
  return { success: true, count: budgetsToCreate.length };
}