"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="
        flex items-center gap-1.5 rounded-full transition-colors duration-200
        
        /* Mobile: Compact pill shape, small text */
        w-auto px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100
        
        /* Typography: Smaller text on mobile */
        text-xs font-bold sm:text-sm sm:font-medium
        
        /* Desktop: Slightly larger padding */
        sm:px-4 sm:py-2
      "
    >
      {/* Change: Added 'hidden' (hides on mobile) 
         and 'sm:block' (shows on desktop/tablet) 
      */}
      <svg 
        className="hidden sm:block w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      
      <span>Sign Out</span>
    </button>
  );
}