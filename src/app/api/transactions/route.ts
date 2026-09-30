import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { normalizeCategory } from "@/lib/categories";
import { parseDateOnly } from "@/lib/dates";

const TransactionSchema = z.object({
  merchant: z.string().trim().min(1, "Merchant is required").max(200),
  amount: z.coerce.number().positive("Amount must be more than zero").max(1e12),
  date: z.string(),
  category: z.string().optional(),
  // Only accept images we uploaded to Cloudinary
  receiptUrl: z.string().url().startsWith("https://res.cloudinary.com/").optional(),
  receiptId: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = TransactionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid transaction" }, { status: 400 });
    }
    const data = parsed.data;

    const date = parseDateOnly(data.date);
    if (!date) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, currency: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: data.amount,
        date,
        description: data.merchant,
        category: normalizeCategory(data.category),
        currency: user.currency,
        receiptUrl: data.receiptUrl,
        receiptId: data.receiptId,
      },
      select: { id: true },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Failed to save transaction:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
