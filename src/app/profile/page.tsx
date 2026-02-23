import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Image from "next/image";
import SignOutButton from "@/components/ui/SignOutButton";
import MonoConnectButton from "@/components/ui/MonoConnectButton";
import { ClearDataButton } from "@/components/ui/ClearDataButton";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { _count: { select: { transactions: true } } } // Count their transactions
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Profile</h1>

      {/* User Card */}
      <div className="bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
        <div className="h-24 w-24 rounded-full bg-indigo-100 mb-4 overflow-hidden relative">
            {user?.image ? (
                <Image src={user.image} alt="Profile" fill className="object-cover" />
            ) : (
                <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-indigo-600">
                    {user?.name?.charAt(0) || user?.email?.charAt(0)}
                </div>
            )}
        </div>
        <h2 className="text-xl font-bold">{user?.name || "User"}</h2>
        <p className="text-slate-500">{user?.email}</p>
        
        <div className="mt-6 flex gap-8 border-t border-slate-100 dark:border-slate-800 pt-6 w-full justify-center">
            <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{user?._count.transactions}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Transactions</p>
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{user?.currency}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Currency</p>
            </div>
        </div>
      </div>

      {/* mono Section */}
      <div className="mt-8 space-y-4">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold mb-4">Connect Mono</h3>
            <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Connect to your bank account</span>
                <MonoConnectButton />
            </div>
        </div>
      </div>
      {/* Settings Section */}
      <div className="mt-8 space-y-4">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold mb-4">Account Actions</h3>
            <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Sign out of your account</span>
                <SignOutButton />
            </div>
        </div>
      </div>
      {/* clear Section */}
      <div className="mt-8 space-y-4">
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold mb-4">Delete all Transactions</h3>
            <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Clear all your transactions.</span>
                <ClearDataButton />
            </div>
        </div>
      </div>
    </div>
  );
}