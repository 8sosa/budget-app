// components/ui/MonoConnectButton.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Connect from '@mono.co/connect.js';

export default function MonoConnectButton() {
  const [isLinking, setIsLinking] = useState(false);
  const [monoConnect, setMonoConnect] = useState<Connect | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Ensure this only runs on the client-side
    if (typeof window !== "undefined") {
      const mono = new Connect({
        key: process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY as string,
        onClose: () => console.log('Widget closed'),
        onLoad: () => console.log('Widget loaded'),
        onSuccess: async ({ code }: { code: string }) => {
          setIsLinking(true);
          try {
            const res = await fetch('/api/mono/exchange', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            
            const data = await res.json();
            
            if (res.ok) {
              alert("Bank linked successfully! Syncing transactions...");
              router.refresh();
            } else {
              alert("Failed to link bank: " + data.error);
            }
          } catch (error) {
            console.error(error);
          } finally {
            setIsLinking(false);
          }
        }
      });

      mono.setup(); // This silently pre-loads the widget onto the DOM
      setMonoConnect(mono);
    }
  }, [router]);

  return (
    <button 
      onClick={() => {
        if (monoConnect) {
          monoConnect.open(); // This makes the widget pop up
        }
      }}
      disabled={isLinking || !monoConnect}
      className="flex items-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all shadow-md disabled:opacity-50"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
      {isLinking ? "Linking Account..." : "Link Bank Account"}
    </button>
  );
}