"use client"; // Required for useState (mobile menu toggle)

import { useState } from "react";
import Link from "next/link";
import UserAccountNav from "../ui/UserAccountNav";

// Define navigation items here for easy management
const navItems = [
  { name: "Dashboard", href: "/dashboard" },
  // { name: "Transactions", href: "/transactions" },
  // { name: "Pricing", href: "/pricing" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  // Toggle function for the mobile menu
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* LEFT SIDE: LOGO & DESKTOP NAV */}
        <div className="flex items-center gap-8">
          {/* BRAND LOGO */}
          <Link
            href="/"
            className="group flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Budget
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                AI
              </span>
            </span>
          </Link>

          {/* DESKTOP NAVIGATION (Hidden on mobile) */}
          <div className="hidden md:flex md:items-center md:gap-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE: USER ACTIONS & MOBILE TOGGLE */}
        <div className="flex items-center gap-4">
          {/* User Nav (Always visible) */}
          <UserAccountNav />

          {/* MOBILE MENU BUTTON (Visible only on small screens) */}
          <button
            onClick={toggleMenu}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 md:hidden"
            aria-expanded={isOpen}
          >
            <span className="sr-only">Open main menu</span>
            {/* Hamburger Icon / X Icon Logic */}
            {isOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN (Conditionally rendered) */}
      {isOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)} // Close menu on click
                className="block rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}