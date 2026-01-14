"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

export default function UserAccountNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    // Optional: Render a small skeleton or nothing while loading
    return <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200"></div>;
  }

  if (!session?.user) {
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
    <>
      {/* Dashboard Link (Desktop) */}
      <Link
        href="/dashboard"
        className="hidden sm:block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors mr-2"
      >
        Dashboard
      </Link>

      {/* User Info (Hidden on mobile) */}
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium text-slate-400">Signed in as</p>
        <p className="text-sm font-bold text-slate-700 leading-tight">
          {session.user.name || session.user.email}
        </p>
      </div>

      {/* Avatar */}
      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 shadow-sm ring-2 ring-transparent transition-all hover:ring-indigo-100">
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xs">
            {session.user.email?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Vertical Divider */}
      <div className="mx-1 h-6 w-px bg-slate-200"></div>

      {/* Sign Out Button */}
      <SignOutButton />
    </>
  );
}