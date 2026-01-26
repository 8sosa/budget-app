"use client";

import { useTheme } from "next-themes";
import { updateCurrency } from "@/app/actions/settings";
import { useState, useRef, useEffect, useCallback } from "react";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";

const currencies = [
  { symbol: "₦", label: "Naira" },
  { symbol: "$", label: "USD" },
  { symbol: "£", label: "GBP" },
  { symbol: "€", label: "EUR" },
];

export default function SettingsWidget({ currentCurrency }: { currentCurrency: string }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(widgetRef as React.RefObject<HTMLElement>, () => {
    setIsOpen(false);
  });

  // --- HELPER: DETECT CURRENCY SYMBOL ---
  const getDetectedSymbol = useCallback(() => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      if (timeZone === "Africa/Lagos") return "₦";
      if (timeZone === "Europe/London") return "£";
      
      // Broad Europe check
      const euroZones = ["Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Dublin", "Europe/Vienna"];
      if (euroZones.includes(timeZone) || (timeZone.startsWith("Europe/") && timeZone !== "Europe/London")) {
        return "€";
      }
      
      // Default to USD for Americas or unknown
      return "$";
    } catch (e) {
      return "$";
    }
  }, []);

  // --- EFFECT: AUTO-DETECT ON FIRST VISIT ---
  useEffect(() => {
    setMounted(true);

    // Check if we have already established a preference in the past
    const hasSetPreference = localStorage.getItem("currency_preference_set");

    // If NO preference is set (First time visitor), auto-detect
    if (!hasSetPreference) {
      const detected = getDetectedSymbol();
      
      // Only trigger server update if the detected one is different from current default
      if (detected !== currentCurrency) {
        updateCurrency(detected);
      }

      // Mark that we have set the preference so we don't overwrite it later
      localStorage.setItem("currency_preference_set", "true");
    }
  }, [currentCurrency, getDetectedSymbol]);

  // --- HANDLER: MANUAL CHANGE ---
  const handleCurrencyChange = async (symbol: string) => {
    // User manually chose, so we ensure the flag is set
    localStorage.setItem("currency_preference_set", "true");
    
    await updateCurrency(symbol);
    setIsOpen(false);
  };

  // --- HANDLER: MANUAL AUTO-DETECT CLICK ---
  const handleManualAutoDetect = async () => {
    setDetecting(true);
    const detectedSymbol = getDetectedSymbol();
    
    if (detectedSymbol !== currentCurrency) {
      await updateCurrency(detectedSymbol);
    }
    
    // Ensure flag is set here too
    localStorage.setItem("currency_preference_set", "true");
    
    setTimeout(() => {
      setDetecting(false);
      setIsOpen(false);
    }, 500);
  };

  if (!mounted) return null;

  return (
    <div 
      ref={widgetRef} 
      className="relative z-50"
      onTouchStart={() => setIsTouch(true)}
      onMouseEnter={() => !isTouch && setIsOpen(true)}
      onMouseLeave={() => !isTouch && setIsOpen(false)}
    >
      {/* Settings Button */}
      <button 
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          p-2.5 rounded-xl border transition-all duration-200 group
          ${isOpen 
            ? "bg-white dark:bg-slate-800 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-md" 
            : "bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
          }
        `}
        title="Settings"
      >
        <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500 ease-out" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />
        <div className={`
            fixed left-4 right-4 top-20 z-50
            md:absolute md:right-0 md:top-full md:left-auto md:w-72 md:mt-2
            bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 
            rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 
            p-5 animate-in fade-in slide-in-from-top-2
        `}>
          
          {/* Theme Section */}
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Appearance</h3>
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
              <button 
                onClick={() => setTheme('light')} 
                className={`flex-1 flex items-center justify-center gap-2 text-xs py-2 rounded-md transition-all font-medium ${theme === 'light' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                <span>☀️</span> Light
              </button>
              <button 
                onClick={() => setTheme('dark')} 
                className={`flex-1 flex items-center justify-center gap-2 text-xs py-2 rounded-md transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 shadow-sm text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                <span>🌙</span> Dark
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800 my-4" />

          {/* Currency Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Currency</h3>
              <button 
                onClick={handleManualAutoDetect}
                disabled={detecting}
                className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {detecting ? <span className="animate-spin">⟳</span> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                {detecting ? "Locating..." : "Auto-detect"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {currencies.map((c) => (
                <button
                  key={c.symbol}
                  onClick={() => handleCurrencyChange(c.symbol)}
                  className={`
                    text-sm py-2 px-3 rounded-lg border transition-all text-left flex items-center justify-between
                    ${currentCurrency === c.symbol ? 'border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold' : 'border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900'}
                  `}
                >
                  <span className="font-medium">{c.label}</span>
                  <span className="opacity-50 font-mono">{c.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}