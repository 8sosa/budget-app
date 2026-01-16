"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import SignOutButton from "./SignOutButton";
import SettingsWidget from "./SettingsWidget";

// Define what data this component needs
interface UserAccountNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    currency?: string | null;
  } | null;
}

export default function UserAccountNav({ user }: UserAccountNavProps) {
  const { status } = useSession();

  // Use the currency passed via props, or fallback to default
  const currency = user?.currency || "₦";

  if (status === "loading") {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200"></div>;
  }

  // Fallback if no user prop is provided (though usually handled by parent)
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 shadow-sm"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      
      {/* Settings Widget now lives here */}
      <SettingsWidget currentCurrency={currency} />

      {/* User Info (Hidden on mobile) */}
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-slate-400">Signed in as</p>
        <p className="text-sm font-bold text-slate-700 leading-tight">
          {user.name || user.email}
        </p>
      </div>

      {/* Avatar */}
      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 shadow-sm ring-2 ring-transparent transition-all hover:ring-indigo-100">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xs">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Vertical Divider */}
      <div className="mx-1 h-6 w-px bg-slate-200"></div>

      {/* Sign Out Button */}
      <SignOutButton />
    </div>
  );
}