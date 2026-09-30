"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const SUPPORTED_CURRENCIES = ["₦", "$", "£", "€"];

// `auto` = timezone auto-detection. It only applies to users with no transactions yet,
// so opening the app on a new device or while travelling never changes an existing choice.
export async function updateCurrency(currency: string, options: { auto?: boolean } = {}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return;
  if (!SUPPORTED_CURRENCIES.includes(currency)) return;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, _count: { select: { transactions: true } } },
  });
  if (!user) return;
  if (options.auto && user._count.transactions > 0) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { currency },
  });

  revalidatePath("/", "layout");
}
