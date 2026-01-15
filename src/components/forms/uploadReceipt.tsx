"use client";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { uploadToCloudinary } from "@/app/actions/upload";

type Props = {
  budgetCategories: string[];
};

export default function UploadReceipt({ budgetCategories }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");
  
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

  // --- DRAG AND DROP HANDLERS ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFile(file);
    setPreview(URL.createObjectURL(file));
    setScanResult(null); // Reset previous scan if new file
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  // --- ACTIONS ---

  const handleScan = async () => {
    if (!file) return;
    setIsScanning(true);

    try {
      const uploadData = await uploadToCloudinaryWrapper(file);
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        body: JSON.stringify({ imageUrl: uploadData.url }),
      });
      const result = await response.json();
      
      if (result.success) {
        setScanResult(result.data);
      } else {
        alert("Scan failed: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Upload failed.");
    } finally {
      setIsScanning(false);
    }
  };

  async function uploadToCloudinaryWrapper(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return await uploadToCloudinary(formData);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Saving transaction...");
    setSaving(true);
    console.log("Saving transaction step 1...");

    const formData = new FormData(e.currentTarget);
    console.log("Form Data:", Array.from(formData.entries()));
    const transactionData = {
      merchant: formData.get("merchant"),
      date: formData.get("date"),
      amount: parseFloat(formData.get("total") as string), 
      category: formData.get("category"),
    };

    console.log("Saving transaction:", transactionData);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });

     if (res.ok) {
        setFile(null);          // Clear the image
        setPreview(null);       // Clear the preview
        setScanResult(null);    // Clear the form
        setActiveTab("scan");   // Reset tab
        
        router.refresh();       // Refreshes the Dashboard data without reloading the page
        
        alert("Transaction saved!"); if (res.ok) {
        window.location.reload(); 
      } else {
        const err = await res.json();
        alert("Failed: " + err.error);
      }
    }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  // --- SHARED FORM COMPONENT ---
  const TransactionForm = ({ initialData }: { initialData?: any }) => (
    <form onSubmit={handleSave} className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Merchant Input */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Merchant</label>
        <div className="relative">
          <input 
            name="merchant" 
            type="text" 
            required
            defaultValue={initialData?.merchant || ""} 
            placeholder="e.g. Starbucks"
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all placeholder:text-slate-300 text-base sm:text-sm"
          />
        </div>
      </div>

      {/* Amount & Date Grid - Stacked on Mobile, Side-by-side on Desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</label>
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 font-bold">#</span>
             </div>
            <input 
              name="total" 
              type="number" 
              step="0.01" 
              required
              defaultValue={initialData?.total || ""} 
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 pl-8 outline-none transition-all placeholder:text-slate-300 text-base sm:text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
          <input 
            name="date" 
            type="date" 
            required
            defaultValue={initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
            className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-all text-base sm:text-sm"
          />
        </div>
      </div>

      {/* Category Select */}
      <div className="relative group">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
        <div className="relative">
          <select 
            name="category" 
            required
            defaultValue={initialData?.category || ""}
            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-10 outline-none transition-all text-base sm:text-sm"
          >
            <option value="" disabled>Select Category</option>
            {budgetCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Uncategorized">Uncategorized</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <button 
        type="submit" 
        disabled={saving}
        className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 disabled:opacity-50 transition-all transform active:scale-[0.98] text-sm sm:text-base"
      >
        {saving ? "Saving..." : "Save Transaction"}
      </button>
    </form>
  );

  return (
    // Adaptive padding: p-4 on mobile, p-6 on desktop
    <div className="w-full bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
      
      {/* TABS */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => { setActiveTab("scan"); setScanResult(null); }}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === "scan" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          📷 <span className="hidden sm:inline">Scan Receipt</span><span className="sm:hidden">Scan</span>
        </button>
        <button
          onClick={() => { setActiveTab("manual"); setScanResult(null); }}
          className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === "manual" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          ✍️ <span className="hidden sm:inline">Manual Entry</span><span className="sm:hidden">Manual</span>
        </button>
      </div>

      {/* VIEW: SCANNER */}
      {activeTab === "scan" && (
        <div className="animate-in fade-in duration-300">
          {!scanResult && (
            <>
              {/* FILE UPLOAD ZONE */}
              {!preview ? (
                <div 
                  className={`
                    relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-200 ease-in-out cursor-pointer
                    ${dragActive ? "border-indigo-500 bg-indigo-50 scale-[1.02]" : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50"}
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={onButtonClick}
                >
                    <input 
                      ref={inputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleChange}
                    />
                    
                    <div className="flex flex-col items-center gap-3">
                      <div className={`p-4 rounded-full ${dragActive ? "bg-white text-indigo-600" : "bg-indigo-50 text-indigo-500"}`}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-sm">Tap to upload <span className="hidden sm:inline">or drag & drop</span></p>
                        <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG (max 4MB)</p>
                      </div>
                    </div>
                </div>
              ) : (
                // PREVIEW ZONE
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                   <div className="h-48 sm:h-56 w-full flex items-center justify-center bg-slate-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="Preview" className="object-contain max-h-full max-w-full p-2" />
                      <button 
                        onClick={() => { setFile(null); setPreview(null); }}
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white text-slate-600 p-2 rounded-full shadow-sm backdrop-blur-sm"
                      >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                   </div>
                   
                   <div className="p-4 bg-white">
                      <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-50 transition-all active:scale-[0.98]"
                      >
                          {isScanning ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              Scanning...
                            </span>
                          ) : "✨ Process Receipt"}
                      </button>
                   </div>
                </div>
              )}
            </>
          )}

          {scanResult && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 mb-4">
                 <div className="bg-emerald-100 text-emerald-600 p-1.5 sm:p-2 rounded-full shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                 </div>
                 <div>
                   <p className="text-sm font-bold text-emerald-800">Scan Complete!</p>
                   <p className="text-xs text-emerald-600 mt-1">AI extracted the details below. Please verify the category.</p>
                 </div>
              </div>
              <TransactionForm initialData={scanResult} />
            </div>
          )}
        </div>
      )}

      {/* VIEW: MANUAL FORM */}
      {activeTab === "manual" && (
        <TransactionForm />
      )}
    </div>
  );
}