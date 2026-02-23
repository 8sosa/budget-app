// src/components/ui/AddBankButton.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import Connect from '@mono.co/connect.js';
import { exchangeTokenAndSync } from "@/app/actions/mono";

export function AddBankButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 1. Ensure we are on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  const monoInstance = useMemo(() => {
    if (typeof window === "undefined") return null;

    return new Connect({
      key: process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY!,
      onSuccess: async ({ code }) => {
        setIsConnecting(true);
        try {
          await exchangeTokenAndSync(code);
          alert("Bank linked successfully!");
        } catch (error) {
          console.error("Link error:", error);
        } finally {
          setIsConnecting(false);
        }
      },
    });
  }, [mounted]); // Re-init when mounted

  if (!mounted) return null;

  return (
    <button
      onClick={() => {
        if (monoInstance) {
          monoInstance.setup(); // Pre-setup the widget
          monoInstance.open();
        }
      }}
      disabled={isConnecting}
      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
    >
      {isConnecting ? "LINKING..." : "+ ADD BANK"}
    </button>
  );
}