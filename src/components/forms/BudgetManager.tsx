"use client";

import { useState } from "react";
import { updateGlobalBudget, saveCategoryBudget, deleteBudget } from "@/app/actions/budget";

type Budget = {
  id: string;
  category: string;
  limit: number;
};

type Props = {
  globalBudget: number;
  budgets: Budget[];
};

export default function BudgetManager({ globalBudget, budgets }: Props) {
  // --- STATE ---
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [tempGlobal, setTempGlobal] = useState(globalBudget);
  
  // Create Form State
  const [catName, setCatName] = useState("");
  const [catLimit, setCatLimit] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Edit Item State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

  // --- CALCULATIONS ---
  const totalAllocated = budgets.reduce((sum, b) => sum + b.limit, 0);
  const unallocated = tempGlobal - totalAllocated;
  const percentUsed = Math.min(100, (totalAllocated / tempGlobal) * 100);
  const isOverBudget = unallocated < 0;

  // --- ACTIONS ---
  const handleUpdateGlobal = async () => {
    setIsSaving(true);
    await updateGlobalBudget(Number(tempGlobal));
    setIsEditingGlobal(false);
    setIsSaving(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catLimit) return;
    
    setIsSaving(true);
    await saveCategoryBudget(catName, parseFloat(catLimit));
    setCatName("");
    setCatLimit("");
    setIsSaving(false);
  };

  const startEditing = (budget: Budget) => {
    setEditingId(budget.id);
    setEditAmount(budget.limit.toString());
  };

  const saveEdit = async (categoryName: string) => {
    setIsSaving(true);
    await saveCategoryBudget(categoryName, parseFloat(editAmount));
    setEditingId(null);
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this budget category?")) return;
    setIsSaving(true);
    await deleteBudget(id);
    setIsSaving(false);
  }

  return (
    <div className="space-y-6 w-full">
      
      {/* SECTION 1: GLOBAL CAP (Premium Gradient Card) */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200">
        {/* Decorative Background Circles */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/20 blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-blue-500/20 blur-xl"></div>

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-indigo-100/80">Total Monthly Limit</h3>
            {!isEditingGlobal && (
              <button 
                onClick={() => setIsEditingGlobal(true)} 
                className="text-[10px] sm:text-xs font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full px-2 py-1 sm:px-3 sm:py-1 transition-colors"
              >
                Edit Cap
              </button>
            )}
          </div>

          {isEditingGlobal ? (
            // EDIT GLOBAL MODE
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in duration-200">
              <div className="flex items-center w-full">
                <span className="text-xl sm:text-2xl font-bold opacity-50 mr-1">#</span>
                <input 
                    type="number" 
                    value={tempGlobal} 
                    onChange={(e) => setTempGlobal(parseFloat(e.target.value) || 0)} 
                    className="w-full bg-transparent border-b-2 border-white/30 focus:border-white text-2xl sm:text-3xl font-bold focus:outline-none text-white placeholder-white/50" 
                    autoFocus 
                />
              </div>
              <button 
                onClick={handleUpdateGlobal} 
                disabled={isSaving} 
                className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
              >
                Save
              </button>
            </div>
          ) : (
            // VIEW GLOBAL MODE
            // Responsive text size: smaller on mobile, larger on desktop
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight truncate">
                #{globalBudget.toLocaleString()}
            </div>
          )}

          {/* Progress Bar Area */}
          <div className="mt-4 sm:mt-6 space-y-2">
            <div className="flex flex-col sm:flex-row justify-between text-xs font-medium text-indigo-100/70 gap-1 sm:gap-0">
              <span>Allocated: <span className="text-white">#{totalAllocated.toLocaleString()}</span></span>
              <span className={isOverBudget ? "text-red-200 font-bold" : "text-emerald-200"}>
                {isOverBudget ? `⚠️ Over by #${Math.abs(unallocated).toLocaleString()}` : `Remaining: #${unallocated.toLocaleString()}`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-lg ${isOverBudget ? 'bg-red-400' : 'bg-emerald-400'}`} 
                style={{ width: `${isOverBudget ? 100 : percentUsed}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ADD NEW CATEGORY */}
      <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Add New Split</h4>
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input 
                type="text" 
                placeholder="Category Name (e.g. Groceries)" 
                value={catName} 
                onChange={(e) => setCatName(e.target.value)} 
                className="w-full rounded-lg border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-3 outline-none transition-all" 
                required 
            />
          </div>
          <div className="w-full sm:w-32 relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 text-xs font-bold">#</span>
             </div>
            <input 
                type="number" 
                placeholder="Limit" 
                value={catLimit} 
                onChange={(e) => setCatLimit(e.target.value)} 
                className="w-full rounded-lg border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 pl-7 outline-none transition-all" 
                required 
            />
          </div>
          <div>
            <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full sm:w-auto h-[42px] px-6 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
                {isSaving ? "..." : "Add"}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 3: EDITABLE LIST */}
      {budgets.length > 0 && (
        <section className="space-y-3">
          {budgets.map((budget) => (
            <div 
                key={budget.id} 
                className="group flex items-center justify-between p-3 bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all duration-200"
            >
              
              {/* LEFT SIDE: Name */}
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 text-sm truncate">{budget.category}</p>
                  <p className="text-xs text-slate-400">Monthly Limit</p>
                </div>
              </div>

              {/* RIGHT SIDE: Value & Actions */}
              <div className="flex items-center gap-2 sm:gap-3 pl-2">
                
                {editingId === budget.id ? (
                  // EDIT MODE
                  <div className="flex items-center gap-1 animate-in slide-in-from-right-4 duration-200">
                    <input 
                      type="number" 
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-16 sm:w-20 text-right bg-slate-50 rounded border border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-1 px-1 sm:px-2 text-sm font-bold text-slate-800 outline-none"
                      autoFocus
                    />
                    <button onClick={() => saveEdit(budget.category)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ) : (
                  // VIEW MODE
                  <>
                    <p className="font-bold text-slate-700 text-sm sm:text-base">#{budget.limit.toLocaleString()}</p>
                    
                    {/* Hover Actions: Changed logic for mobile */}
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={() => startEditing(budget)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Edit Limit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(budget.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Budget"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}