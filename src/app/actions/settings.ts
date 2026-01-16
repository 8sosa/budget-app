"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateCurrency(currency: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return;

  await prisma.user.update({
    where: { email: session.user.email },
    data: { currency },
  });
  
  revalidatePath("/");
}