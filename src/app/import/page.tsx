import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import StatementImport from "@/components/forms/StatementImport";
import BankConnections from "@/components/forms/BankConnections";
import { isMonoEnabled } from "@/lib/mono";
import { DEFAULT_CATEGORIES, mergeCategories } from "@/lib/categories";

// Categories the importer suggests, so they're always selectable in the preview
const IMPORT_CATEGORIES = ["Transfers", "Bank Charges", "Savings", "Income", "Salary", "Refunds", "Interest & Rewards"];

export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [user, usedCategories, connections] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { currency: true, name: true, email: true } }),
    prisma.transaction.groupBy({ by: ["category"], where: { userId: session.user.id } }),
    prisma.bankConnection.findMany({
      where: { userId: session.user.id },
      select: { id: true, institution: true, accountName: true, accountNumber: true, lastSyncedAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const categories = mergeCategories(DEFAULT_CATEGORIES, IMPORT_CATEGORIES, usedCategories.map((c) => c.category));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Import bank statement</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 mb-8">
        Upload a statement from OPay, Access Bank or another bank. You&apos;ll see every transaction before anything is saved,
        and lines you&apos;ve imported before are skipped.
      </p>
      <StatementImport categories={categories} currencySymbol={user?.currency || "₦"} />

      <div className="mt-8">
        <BankConnections
          publicKey={isMonoEnabled() ? process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY! : null}
          connections={connections}
          customer={{ name: user?.name || user?.email || "Budget user", email: user?.email || "" }}
        />
      </div>
    </div>
  );
}
