// src/app/api/mono/exchange/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const MONO_SECRET_KEY = process.env.MONO_SECRET_KEY;
    if (!MONO_SECRET_KEY) {
      throw new Error("Missing Mono Secret Key");
    }

    // 1. Exchange the widget code for the Account ID
    const authRes = await fetch("https://api.withmono.com/v2/accounts/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mono-sec-key": process.env.MONO_SECRET_KEY!,
      },
      body: JSON.stringify({ code: code }), // The code from your frontend
    });

    const authData = await authRes.json();

    // Guardrail 1: Catch Auth failures immediately
    if (!authRes.ok) {
      console.error("Mono Auth Error:", authData);
      throw new Error(`Mono Auth failed: ${authData.message || 'Invalid code'}`);
    }

    // Guardrail 2: Safely extract the ID (handles both flat and wrapped v2 payloads)
    const accountId = authData.id || authData.data?.id;

    if (!accountId) {
      console.error("Malformed Auth Response:", authData);
      throw new Error("Missing account ID in Mono response");
    }

    // 2. Fetch Transactions using the validated Account ID
    const txRes = await fetch(`https://api.withmono.com/v2/accounts/${accountId}/transactions`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "mono-sec-key": process.env.MONO_SECRET_KEY!,
      },
    });

    const txData = await txRes.json();

    if (!txRes.ok) {
      console.error("Mono Transactions Error:", txData);
      throw new Error(txData.message || "Failed to fetch transactions");
    }

    // Mono v2 returns transactions inside a `data` array
    const transactions = txData.data || [];
    console.log(transactions)

    // Format transactions to fit our Prisma database schema
    // Note: Mono returns amounts in kobo/pesewas, so we divide by 100
    const formattedTransactions = transactions.map((tx: any) => {
      const amountInNaira = (tx.amount || 0) / 100;

      // Extract merchant name if it exists
      const merchantName = tx.merchant?.name;

      return {
        userId: session.user.id,
        // If your schema uses a string type like "EXPENSE", map it here instead of positive/negative numbers if needed
        amount: tx.type === "debit" ? -amountInNaira : amountInNaira,
        date: new Date(tx.date || Date.now()),
        category: tx.category || "Uncategorized",
        
        // Combine merchant and narration so we don't need a separate merchant column
        description: merchantName ? `${tx.narration} (${merchantName})` : (tx.narration || "Bank Transaction"),
        
        // Notice we removed the `merchant:` line entirely so Prisma stays happy!
      };
    });

    // Step 3: Save them all to your database
    if (formattedTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: formattedTransactions,
      });
    }

    return NextResponse.json({ success: true, count: formattedTransactions.length });
  } catch (error: any) {
    console.error("Mono Exchange Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}