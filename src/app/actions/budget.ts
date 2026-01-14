"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// 1. Set the Global Monthly Limit
export async function updateGlobalBudget(amount: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { email: session.user.email },
    data: { monthlyBudget: amount }
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// 2. Add/Update a Category Budget
export async function saveCategoryBudget(category: string, limit: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return { error: "User not found" };

  // Check if budget for this category exists, update if yes, create if no
  const existingBudget = await prisma.budget.findFirst({
    where: { userId: user.id, category: category }
  });

  if (existingBudget) {
    await prisma.budget.update({
      where: { id: existingBudget.id },
      data: { limit }
    });
  } else {
    await prisma.budget.create({
      data: {
        userId: user.id,
        category,
        limit
      }
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBudget(budgetId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  // Optional: Verify ownership logic here for strict security
  await prisma.budget.delete({
    where: { id: budgetId },
  });

  revalidatePath("/dashboard");
  return { success: true };
}