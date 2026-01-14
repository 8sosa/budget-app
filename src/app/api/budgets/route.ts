// src/app/api/budgets/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. Receive 'amount' from the form, but treat it as 'limit'
  const { category, amount } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const budget = await prisma.budget.upsert({
    where: {
      userId_category: {
        userId: user.id,
        category: category,
      },
    },
    // 2. USE 'limit' HERE (Matches your Schema)
    update: { limit: amount }, 
    create: {
      userId: user.id,
      category: category,
      limit: amount, // <--- CHANGED FROM 'amount' TO 'limit'
    },
  });

  return NextResponse.json(budget);
}