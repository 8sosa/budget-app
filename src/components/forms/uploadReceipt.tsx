"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { uploadToCloudinary } from "@/app/actions/upload";

// --- ICONS (Inline for zero dependencies) ---
const Icons = {
  Scan: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>,
  Edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Upload: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Sparkles: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
};

type Props = {
  budgetCategories: string[];
  currencySymbol: string;
};

// --- TOAST NOTIFICATION TYPE ---
type ToastState = { type: 'success' | 'error', message: string } | null;

export default function UploadReceipt({ budgetCategories, currencySymbol }: Props) {
  console.log(budgetCategories);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("manual");
  
  // Drag & Drop State
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scan States
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // General States
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- DRAG AND DROP HANDLERS ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const handleFile = (file: File) => {
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setScanResult(null);
  };

  // --- ACTIONS ---
  const handleScan = async () => {
    if (!file) return;
    setIsScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadData = await uploadToCloudinary(formData);
      
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });
      const result = await response.json();
      
      if (result.success) setScanResult(result.data);
      else setToast({ type: 'error', message: "Scan failed: " + result.error });
      
    } catch (error) {
      setToast({ type: 'error', message: "Upload failed. Please try again." });
    } finally {
      setIsScanning(false);
    }
  };

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const transactionData = {
      merchant: formData.get("merchant"),
      date: formData.get("date"),
      amount: parseFloat(formData.get("total") as string), 
      category: formData.get("category"),
    };

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });

      if (res.ok) {
        setToast({ type: 'success', message: "Transaction saved successfully!" });
        setFile(null);
        setPreview(null);
        setScanResult(null);
        setActiveTab("scan"); // Reset to default
        router.refresh();
      } else {
        const err = await res.json();
        setToast({ type: 'error', message: err.error || "Failed to save." });
      }
    } catch (error) {
      setToast({ type: 'error', message: "An unexpected error occurred." });
    } finally {
      setSaving(false);
    }
  }

  // --- SHARED FORM COMPONENT ---
  const TransactionForm = ({ initialData }: { initialData?: any }) => (
    <form onSubmit={handleSave} className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Merchant Input */}
      <div className="group">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Merchant</label>
        <input 
          name="merchant" 
          type="text" 
          required
          defaultValue={initialData?.merchant || ""} 
          placeholder="e.g. Starbucks, Uber, Amazon"
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Amount & Date Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Amount</label>
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 font-semibold">{currencySymbol}</span>
             </div>
            <input 
              name="total" 
              type="number" 
              step="0.01" 
              required
              defaultValue={initialData?.total || ""} 
              placeholder="0.00"
              className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-medium"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Date</label>
          <input 
            name="date" 
            type="date" 
            required
            defaultValue={initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Category Select */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Category</label>
        <div className="relative">
          <select 
            name="category" 
            required
            defaultValue={initialData?.category || ""}
            className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="" disabled>Select a category...</option>
            {budgetCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Uncategorized">Uncategorized</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={saving}
        className="w-full relative mt-4 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/20 dark:shadow-indigo-900/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.99] overflow-hidden"
      >
        <div className={`flex items-center justify-center gap-2 ${saving ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
          <span>Save Transaction</span>
        </div>
        
        {saving && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          </div>
        )}
      </button>
    </form>
  );

  return (
    <div className="relative w-full bg-white dark:bg-slate-950 p-1 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800/60 overflow-hidden">
      
      {/* --- TOAST NOTIFICATION --- */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-xl border text-sm font-medium ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300' 
              : 'bg-red-50 border-red-100 text-red-700 dark:bg-red-950 dark:border-red-900 dark:text-red-300'
          }`}>
             {toast.type === 'success' ? <Icons.Check /> : <Icons.X />}
             {toast.message}
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {/* TABS (Segmented Control) */}
        <div className="relative flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl mb-8">
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-800 rounded-xl shadow-sm transition-all duration-300 ease-spring ${
              activeTab === "manual" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"
            }`} 
          />
          <button
            onClick={() => { setActiveTab("manual"); setScanResult(null); }}
            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 ${
              activeTab === "manual" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Icons.Edit /> <span>Manual</span>
          </button>
          <button
            onClick={() => { setActiveTab("scan"); setScanResult(null); }}
            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-2 ${
              activeTab === "scan" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Icons.Scan /> <span>Scan Receipt</span>
          </button>
        </div>
        {/* --- VIEW: MANUAL FORM --- */}
        {activeTab === "manual" && (
          <div className="animate-in fade-in duration-300">
             <TransactionForm />
          </div>
        )}
        {/* --- VIEW: SCANNER --- */}
        {activeTab === "scan" && (
          <div className="animate-in fade-in duration-300">
            {!scanResult && (
              <>
                {!preview ? (
                  // DROP ZONE
                  <div 
                    className={`
                      relative group h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                      ${dragActive 
                        ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 scale-[1.01]" 
                        : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      }
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                  >
                    <input 
                      ref={inputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleChange}
                    />
                    
                    <div className="relative">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${dragActive ? 'bg-indigo-100 text-indigo-600 scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 dark:group-hover:bg-slate-800 dark:group-hover:text-indigo-400'}`}>
                           <Icons.Upload />
                        </div>
                    </div>
                    
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                       Click to upload or drag & drop
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                       Supports PNG, JPG, WEBP (Max 5MB)
                    </p>
                  </div>
                ) : (
                  // PREVIEW ZONE
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 aspect-video group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                      
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      
                      <button 
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-300 rounded-full shadow-sm hover:text-red-500 transition-colors"
                      >
                         <Icons.X />
                      </button>
                    </div>
                    
                    <button
                      onClick={handleScan}
                      disabled={isScanning}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-70 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {isScanning ? (
                        <>
                           <svg className="animate-spin h-5 w-5 text-white/80" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                           <span>Scanning Receipt...</span>
                        </>
                      ) : (
                         <>
                           <Icons.Sparkles /> <span>Extract Data with AI</span>
                         </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* SCAN RESULT FORM */}
            {scanResult && (
              <div className="animate-in slide-in-from-bottom-8 fade-in duration-500">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl flex items-start gap-4">
                   <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 p-2 rounded-full shrink-0">
                      <Icons.Check />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Scan Successful!</p>
                     <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-1 leading-relaxed">
                       We've extracted the details below. Please verify the category before saving.
                     </p>
                   </div>
                </div>
                <TransactionForm initialData={scanResult} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}