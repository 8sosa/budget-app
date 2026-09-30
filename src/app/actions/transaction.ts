"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteTransaction(transactionId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return { error: "Unauthorized" };

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { error: "User not found" };

    // Scoped to the user, so nobody can delete someone else's transaction
    const { count } = await prisma.transaction.deleteMany({
      where: { id: transactionId, userId: user.id }
    });
    if (count === 0) return { error: "Transaction not found" };

    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/budget");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete" };
  }
}
