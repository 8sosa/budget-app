// src/app/actions/mono.ts
"use server"

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MONO_SEC_KEY = process.env.MONO_SECRET_KEY!;

/**
 * FETCH & SAVE TRANSACTIONS
 * Helper to pull history from Mono and save to our DB
 */
async function syncTransactionsForAccount(bankStoreId: string, monoAccountId: string, userId: string) {
  const response = await fetch(`https://api.withmono.com/accounts/${monoAccountId}/transactions`, {
    headers: { "mono-sec-key": MONO_SEC_KEY }
  });

  if (!response.ok) return;

  const { data: monoTransactions } = await response.json();

  // 1. Fetch existing receiptIds to avoid duplicates
  const existingTransactions = await prisma.transaction.findMany({
    where: { userId, bankAccountId: bankStoreId },
    select: { receiptId: true }
  });
  
  const existingIds = new Set(existingTransactions.map(t => t.receiptId));

  // 2. Map & Filter out existing ones
  const newTransactions = monoTransactions
    .filter((t: any) => !existingIds.has(t._id)) // Only keep transactions we don't have
    .map((t: any) => ({
      userId: userId,
      bankAccountId: bankStoreId,
      amount: t.type === "debit" ? -(t.amount / 100) : (t.amount / 100),
      category: t.category || "General",
      description: t.narration || "No description",
      date: new Date(t.date),
      receiptId: t._id 
    }));

  // 3. Batch insert only the new data
  if (newTransactions.length > 0) {
    await prisma.transaction.createMany({
      data: newTransactions
    });
  }
}

// src/app/actions/mono.ts

export async function exchangeTokenAndSync(code: string) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const userId = session?.user?.id;
  
  if (!userId) return { error: "Unauthorized" };

  try {
    // 1. Exchange code for Account ID
    const authRes = await fetch("https://api.withmono.com/account/auth", {
      method: "POST",
      headers: { 
        "mono-sec-key": process.env.MONO_SECRET_KEY!, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ code })
    });
    
    const authData = await authRes.json();

    if (!authRes.ok || !authData.id) {
      console.error("Mono Auth Exchange Failed:", authData);
      return { error: "Failed to authenticate with Mono" };
    }

    const monoAccountId = authData.id;

    // 2. Fetch Account Details
    const accRes = await fetch(`https://api.withmono.com/accounts/${monoAccountId}`, {
      headers: { "mono-sec-key": process.env.MONO_SECRET_KEY! }
    });
    
    const accData = await accRes.json();
    console.log("Mono Account Data:", JSON.stringify(accData, null, 2));

    // CHECK: If Mono says "Not Found", stop here
    if (!accRes.ok || !accData.account) {
      return { error: `Mono Account Error: ${accData.message || 'Details not available yet'}` };
    }

    const account = accData.account;

    // 3. Save to BankStore
    const bank = await prisma.bankStore.create({
      data: {
        userId: userId,
        monoAccountId: monoAccountId,
        institutionName: account.institution?.name || "Connected Bank",
        accountName: account.name || "Main Account",
        accountNumber: account.account_number || "0000000000",
        balance: (account.balance || 0) / 100,
        currency: account.currency || "NGN",
      }
    });

    // 4. Initial Transaction Sync
    await syncTransactionsForAccount(bank.id, monoAccountId, userId);

    revalidatePath("/finances");
    return { success: true };

  } catch (error) {
    console.error("Exchange Error:", error);
    return { error: "An unexpected error occurred while linking your bank." };
  }
}

/**
 * REFRESH BALANCE & HISTORY
 * Updates existing bank record
 */
export async function syncBankBalance(bankStoreId: string, monoAccountId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const response = await fetch(`https://api.withmono.com/accounts/${monoAccountId}`, {
      method: 'GET',
      headers: { 'mono-sec-key': MONO_SEC_KEY },
    });

    const data = await response.json();
    const account = data.account;
    
    await prisma.bankStore.update({
      where: { id: bankStoreId },
      data: { 
        balance: account.balance / 100,
        lastSynced: new Date()
      },
    });

    // Also pull latest transactions
    await syncTransactionsForAccount(bankStoreId, monoAccountId, session.user.id);

    revalidatePath("/finances");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}