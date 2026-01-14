"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm font-medium text-red-600 hover:text-red-800 transition"
    >
      Sign Out
    </button>
  );
}