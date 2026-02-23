"use client";

import { useState } from "react";

export function ReceiptModal({ url }: { url: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Thumbnail Trigger */}
      <div 
        onClick={() => setIsOpen(true)}
        className="relative group cursor-zoom-in rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900"
      >
        <img 
          src={url} 
          alt="Receipt Thumbnail" 
          className="w-full h-auto object-contain max-h-[300px] transition-transform duration-500 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
          <span className="bg-white/90 text-slate-900 px-4 py-2 rounded-full text-xs font-bold shadow-lg">
            Click to View Full Size
          </span>
        </div>
      </div>

      {/* Full Screen Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white hover:text-slate-300 p-2"
            onClick={() => setIsOpen(false)}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          
          <img 
            src={url} 
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300"
            alt="Full Receipt"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
          />
        </div>
      )}
    </>
  );
}