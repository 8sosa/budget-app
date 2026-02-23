"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/actions/transaction";
import { uploadToCloudinary } from "@/app/actions/upload"; // Using your existing action
import { useRouter } from "next/navigation";
import { Transaction } from "@prisma/client";

export function TransactionEditForm({ 
  transaction, 
  availableCategories 
}: { 
  transaction: Transaction; 
  availableCategories: string[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(transaction.description || "");
  const [category, setCategory] = useState(transaction.category);
  const [receiptUrl, setReceiptUrl] = useState(transaction.receiptUrl || "");
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // --- Handle Receipt Upload via Cloudinary ---
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Reuse your existing Cloudinary action
      const uploadData = await uploadToCloudinary(formData);
      
      if (uploadData?.url) {
        setReceiptUrl(uploadData.url);
      }
    } catch (error) {
      alert("Failed to upload receipt.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!description.trim()) return alert("Description is required");
    setLoading(true);
    try {
      await updateTransaction(transaction.id, { 
        description, 
        category, 
        receiptUrl 
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      alert("Error saving changes.");
    } finally {
      setLoading(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex justify-between items-start animate-in fade-in">
        <div>
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            {transaction.category}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {transaction.description || "Untitled Transaction"}
          </h1>
        </div>
        <button 
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-slate-600 border px-4 py-2 rounded-lg hover:bg-slate-50 transition-all"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Description */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Merchant</label>
          <input 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 rounded-xl border dark:bg-slate-950 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Category</label>
          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 rounded-xl border dark:bg-slate-950 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipt Management */}
      <div className="pt-2">
        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 ml-1">Receipt Attachment</label>
        <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          {receiptUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
              <img src={receiptUrl} alt="Receipt Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => setReceiptUrl("")}
                className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
               🧾
            </div>
          )}
          
          <div className="flex-1">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              disabled={uploading}
              className="text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
            />
            {uploading && <p className="text-[10px] text-indigo-500 mt-1 animate-pulse font-medium">Uploading to Cloudinary...</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={async () => {
            if(confirm("Delete this transaction?")) {
               await deleteTransaction(transaction.id);
               router.push("/dashboard");
            }
          }}
          className="text-xs font-semibold text-red-500 hover:text-red-600 transition"
        >
          Delete
        </button>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 text-sm font-medium text-slate-500"
          >
            Cancel
          </button>
          <button 
            disabled={loading || uploading}
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 transition-all active:scale-95"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}