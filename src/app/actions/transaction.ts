"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // We will ensure this exists in a moment
import prisma from "@/lib/prisma"; // Make sure you have your prisma client instance
import { revalidatePath } from "next/cache";
import { z } from "zod";

// 1. Define the validation schema
const TransactionSchema = z.object({
  amount: z.coerce.number().positive(), // coerce converts strings to numbers
  description: z.string().min(1, "Merchant/Description is required"),
  date: z.coerce.date(),
  category: z.string().min(1),
  receiptUrl: z.string().optional(),
});

export async function saveTransaction(prevState: any, formData: FormData) {
  // 2. Authenticate
  const session = await getServerSession(authOptions); 
  // Note: You need to pass your authOptions here. If you haven't moved them to a separate file yet, see the note below.
  
  if (!session || !session.user || !session.user.email) {
    return { message: "Unauthorized. Please log in." };
  }

  // 3. Find the user in the DB (to get their ID)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return { message: "User not found." };
  }

  // 4. Validate Data
  const validatedFields = TransactionSchema.safeParse({
    amount: formData.get("amount"),
    description: formData.get("merchant"), // Mapping 'merchant' form field to 'description' db field
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

  const data = validatedFields.data;

  try {
    // 5. Save to MongoDB via Prisma
    await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: data.amount,
        description: data.description,
        date: data.date,
        category: data.category,
        receiptUrl: data.receiptUrl,
        currency: "USD", // Default or extract from form if you want multi-currency
      },
    });

    // 6. Revalidate the dashboard so the new transaction shows up instantly
    revalidatePath("/dashboard");
    
    return { success: true, message: "Transaction saved successfully!" };

  } catch (e) {
    console.error(e);
    return { message: "Database Error: Failed to create transaction." };
  }
}

export async function deleteTransaction(transactionId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return { error: "Unauthorized" };

  try {
    // Verify the transaction belongs to the user before deleting
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) return { error: "User not found" };

    await prisma.transaction.delete({
      where: {
        id: transactionId,
        userId: user.id // Security: Ensure ownership
      }
    });

    // Refresh the dashboard so the item disappears immediately
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete" };
  }
}

