"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateGlobalBudget(amount: number, type: "monthly" | "yearly", month?: number, year?: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email }});
  if (!user) throw new Error("User not found");

  if (type === "yearly") {
    // Yearly budget is still just one static number on the User model
    await prisma.user.update({
      where: { email: session.user.email },
      data: { yearlyBudget: amount },
    });
  } else {
    // Monthly Budget: Save to the Specific Month Table (MonthlyCap)
    if (month === undefined || year === undefined) throw new Error("Month/Year required");

    await prisma.monthlyCap.upsert({
      where: { 
        userId_month_year: { userId: user.id, month, year } // Composite unique key
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

export async function saveCategoryBudget(category: string, limit: number, month: number, year: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { email: session.user.email }});
  if (!user) throw new Error("User not found");

  // Upsert: Update if exists, Create if not
  await prisma.budget.upsert({
    where: {
      userId_category_month_year: { // Composite unique key from schema
        userId: user.id,
        category,
        month,
        year
      }
    },
    update: { limit },
    create: {
      userId: user.id,
      category,
      limit,
      month,
      year
    }
  });

  revalidatePath("/dashboard");
}

export async function deleteBudget(id: string) {
  // Delete remains the same (ID is unique)
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");

  await prisma.budget.delete({ where: { id } });
  revalidatePath("/dashboard");
}