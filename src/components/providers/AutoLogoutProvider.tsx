"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react"; // 👈 If using NextAuth
// import { logoutAction } from "@/app/actions/auth"; // 👈 OR use your server action

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 Hour
// const INACTIVITY_LIMIT_MS = 10 * 1000; // 10 Seconds (For testing)

export default function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // The actual logout logic
  const performLogout = useCallback(async () => {
    try {
      // 1. Clear local storage markers
      if (typeof window !== "undefined") {
        localStorage.removeItem("lastActive");
      }

      // 2. Trigger Logout
      // OPTION A: NextAuth
      await signOut({ callbackUrl: "/login" });
      
      // OPTION B: Custom Server Action
      // await logoutAction(); 
      // router.push("/login");

    } catch (error) {
      console.error("Logout failed", error);
    }
  }, [router]);

  const checkInactivity = useCallback(() => {
    const lastActive = localStorage.getItem("lastActive");
    
    // If no record exists, set it to now
    if (!lastActive) {
      localStorage.setItem("lastActive", Date.now().toString());
      return;
    }

    const timeSinceLastActivity = Date.now() - Number(lastActive);

    // If time exceeded limit, log out
    if (timeSinceLastActivity > INACTIVITY_LIMIT_MS) {
      performLogout();
    }
  }, [performLogout]);

  const updateActivity = useCallback(() => {
    // We throttle this slightly to avoid hitting LocalStorage on every single pixel mousemove
    // We only update if 10 seconds have passed since the last write, 
    // OR if we are just initializing.
    const now = Date.now();
    const lastActive = Number(localStorage.getItem("lastActive") || 0);

    // Only update storage if 1 minute has passed to save performance, 
    // or strictly update on every action if you want extreme precision.
    // Here we update on every action but you could throttle it.
    localStorage.setItem("lastActive", now.toString());
  }, []);

  useEffect(() => {
    // 1. Events that count as "activity"
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // 2. Add listeners to update timestamp
    // We wrap updateActivity in a throttle logic inside if needed, 
    // but for simple localstorage writes, native browser handling is usually fine.
    events.forEach((event) => window.addEventListener(event, updateActivity));

    // 3. Set interval to check inactivity every 1 minute
    const intervalId = setInterval(checkInactivity, 60 * 1000); 

    // 4. Initial check on mount
    updateActivity();

    // Cleanup
    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
      clearInterval(intervalId);
    };
  }, [checkInactivity, updateActivity]);

  return <>{children}</>;
}