import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth"; // Make sure this path is correct for your project

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    
    // Find the user to get their ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Create the transaction in the database
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amount: Number(data.amount),
        date: new Date(data.date),
        description: data.merchant || data.description, // Use merchant as description
        category: data.category || "Other",
        // type: "EXPENSE", // Assuming receipts are always expenses
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Failed to save transaction:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}