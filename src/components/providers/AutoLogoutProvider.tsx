"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 Hour

export default function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const performLogout = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("lastActive");
      }

      await signOut({ callbackUrl: "/login" });

    } catch (error) {
      console.error("Logout failed", error);
    }
  }, [router]);

  const checkInactivity = useCallback(() => {
    const lastActive = localStorage.getItem("lastActive");
    
    if (!lastActive) {
      localStorage.setItem("lastActive", Date.now().toString());
      return;
    }

    const timeSinceLastActivity = Date.now() - Number(lastActive);

    if (timeSinceLastActivity > INACTIVITY_LIMIT_MS) {
      performLogout();
    }
  }, [performLogout]);

  const updateActivity = useCallback(() => {
    const now = Date.now();
    const lastActive = Number(localStorage.getItem("lastActive") || 0);
    localStorage.setItem("lastActive", now.toString());
  }, []);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((event) => window.addEventListener(event, updateActivity));

    const intervalId = setInterval(checkInactivity, 60 * 1000); 

    updateActivity();

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      clearInterval(intervalId);
    };
  }, [checkInactivity, updateActivity]);

  return <>{children}</>;
}