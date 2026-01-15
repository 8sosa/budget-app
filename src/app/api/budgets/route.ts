import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1. You must extract month and year from the request body
  const { category, amount, month, year } = await req.json();

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const budget = await prisma.budget.upsert({
    where: {
      // 2. FIX: The unique identifier is now a compound of 4 fields
      // Prisma names this automatically based on your @@unique([...]) in schema.prisma
      userId_category_month_year: {
        userId: user.id,
        category: category,
        month: month,
        year: year,
      },
    },
    update: { limit: amount }, 
    create: {
      userId: user.id,
      category: category,
      limit: amount,
      // 3. FIX: Add missing required fields
      month: month,
      year: year,
    },
  });

  return NextResponse.json(budget);
}