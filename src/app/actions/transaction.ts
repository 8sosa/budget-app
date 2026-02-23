"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schema for Create/Update
const TransactionSchema = z.object({
  amount: z.coerce.number(), // Removed .positive() to allow for expenses/debits
  description: z.string().min(1, "Description is required"),
  date: z.coerce.date(),
  category: z.string().min(1),
  receiptUrl: z.string().optional(),
});

/**
 * UPDATE TRANSACTION
 * Used for reassigning categories and editing descriptions
 */
export async function updateTransaction(id: string, data: { description: string, category: string, receiptUrl?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  // Security: Ensure the user actually owns this transaction
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== (session.user as any).id) {
    throw new Error("Forbidden");
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      description: data.description,
      category: data.category,
      receiptUrl: data.receiptUrl,
    },
  });

  // Clear caches to show updated data immediately
  revalidatePath(`/transactions/${id}`);
  revalidatePath("/dashboard");
}

/**
 * SAVE NEW TRANSACTION (Manual Entry)
 */
export async function saveTransaction(prevState: any, formData: FormData) {
  const session = await getServerSession(authOptions); 
  
  if (!session?.user?.email) {
    return { message: "Unauthorized. Please log in." };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) return { message: "User not found." };

  const validatedFields = TransactionSchema.safeParse({
    amount: formData.get("amount"),
    description: formData.get("description") || formData.get("merchant"),
    date: formData.get("date"),
    category: formData.get("category"),
    receiptUrl: formData.get("receiptUrl"),
  });

  if (!validatedFields.success) {
    return { 
      message: "Validation Error", 
      errors: validatedFields.error.flatten().fieldErrors 
    };
  }

  try {
    await prisma.transaction.create({
      data: {
        ...validatedFields.data,
        userId: user.id,
        currency: "NGN", // Updated to NGN for your use case
      },
    });

    revalidatePath("/dashboard");
    return { success: true, message: "Transaction saved successfully!" };
  } catch (e) {
    return { message: "Database Error: Failed to create transaction." };
  }
}

/**
 * DELETE TRANSACTION
 */
export async function deleteTransaction(transactionId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: "Unauthorized" };

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { error: "User not found" };

    await prisma.transaction.delete({
      where: {
        id: transactionId,
        userId: user.id 
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete" };
  }
}

export async function clearUserTransactions() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Unauthorized");

    // 1. Find the user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) throw new Error("User not found");

    // 2. Delete all transactions belonging to this user
    const result = await prisma.transaction.deleteMany({
      where: { userId: user.id }
    });

    // 3. Refresh the finance page data
    revalidatePath("/finances");

    return { success: true, count: result.count };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: "Failed to clear transactions" };
  }
}