"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateGlobalBudget, saveCategoryBudget, deleteBudget } from "@/app/actions/budget";

type Budget = {
  id: string;
  category: string;
  limit: number;
};

type Props = {
  monthlyBudget: number;
  yearlyBudget: number;
  budgets: Budget[];
  currentMonth: number;
  currentYear: number;
  initialView?: 'monthly' | 'yearly';
};

export default function BudgetManager({ 
  monthlyBudget, 
  yearlyBudget, 
  budgets, 
  currentMonth, 
  currentYear,
  initialView = 'monthly'
}: Props) {
  
  const router = useRouter();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>(initialView);
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  
  const [tempMonthly, setTempMonthly] = useState(monthlyBudget);
  const [tempYearly, setTempYearly] = useState(yearlyBudget);

  // Form State
  const [catName, setCatName] = useState("");
  const [catLimit, setCatLimit] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

  useEffect(() => {
    setTempMonthly(monthlyBudget);
    setTempYearly(yearlyBudget);
    setActiveTab(initialView);
  }, [monthlyBudget, yearlyBudget, initialView]);

  // --- CALCULATIONS ---
  const totalMonthlyAllocated = budgets.reduce((sum, b) => sum + b.limit, 0);
  const currentGlobal = activeTab === 'monthly' ? tempMonthly : tempYearly;
  
  const allocatedComparison = activeTab === 'monthly' 
    ? totalMonthlyAllocated 
    : totalMonthlyAllocated * 12;

  const unallocated = currentGlobal - allocatedComparison;
  
  const percentUsed = currentGlobal > 0 
    ? Math.min(100, (allocatedComparison / currentGlobal) * 100) 
    : 0;
    
  const isOverBudget = unallocated < 0;

  // --- ACTIONS ---
  const handleUpdateGlobal = async () => {
    setIsSaving(true);
    const amount = Number(activeTab === 'monthly' ? tempMonthly : tempYearly);
    
    if (activeTab === 'monthly') {
        // Update Monthly AND Yearly
        const updateMonthly = updateGlobalBudget(amount, 'monthly', currentMonth, currentYear);
        const newYearly = amount * 12;
        setTempYearly(newYearly); 
        const updateYearly = updateGlobalBudget(newYearly, 'yearly', currentMonth, currentYear);

        await Promise.all([updateMonthly, updateYearly]);
    } else {
        // Update Yearly only
        await updateGlobalBudget(amount, 'yearly', currentMonth, currentYear);
    }
    
    router.refresh(); 
    setIsEditingGlobal(false);
    setIsSaving(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catLimit) return;
    
    setIsSaving(true);
    await saveCategoryBudget(catName, parseFloat(catLimit), currentMonth, currentYear);
    
    setCatName("");
    setCatLimit("");
    router.refresh(); 
    setIsSaving(false);
  };

  // 👇 THIS FUNCTION WAS MISSING
  const startEditing = (budget: Budget) => {
    setEditingId(budget.id);
    setEditAmount(budget.limit.toString());
  };

  const saveEdit = async (categoryName: string) => {
    setIsSaving(true);
    await saveCategoryBudget(categoryName, parseFloat(editAmount), currentMonth, currentYear);
    
    setEditingId(null);
    router.refresh(); 
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this budget category?")) return;
    
    setIsSaving(true);
    await deleteBudget(id);
    
    router.refresh(); 
    setIsSaving(false);
  }

  return (
    <div className="space-y-6 w-full">
      
      {/* SECTION 1: GLOBAL CAP */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 transition-all duration-500">
        
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/20 blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-blue-500/20 blur-xl"></div>
        
        <div className="relative p-5 sm:p-6">
          {/* HEADER: Title + Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-xs font-bold tracking-widest uppercase text-indigo-100/80">
              {activeTab === 'monthly' ? 'Monthly Spending Limit' : 'Annual Spending Goal'}
            </h3>
            
            {/* View Toggle */}
            <div className="flex bg-black/20 rounded-lg p-1 self-start sm:self-auto backdrop-blur-sm">
              <button
                onClick={() => { setActiveTab('monthly'); setIsEditingGlobal(false); }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'monthly' ? 'bg-white text-indigo-600 shadow' : 'text-indigo-200 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => { setActiveTab('yearly'); setIsEditingGlobal(false); }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeTab === 'yearly' ? 'bg-white text-indigo-600 shadow' : 'text-indigo-200 hover:text-white'}`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* EDIT/VIEW LOGIC */}
          <div className="flex items-center justify-between">
            <div className="w-full">
                {isEditingGlobal ? (
                    <div className="flex items-center gap-3 animate-in fade-in duration-200">
                    <span className="text-2xl font-bold opacity-50">#</span>
                    <input 
                        type="number" 
                        value={activeTab === 'monthly' ? tempMonthly : tempYearly} 
                        onChange={(e) => activeTab === 'monthly' ? setTempMonthly(parseFloat(e.target.value)) : setTempYearly(parseFloat(e.target.value))} 
                        className="w-full max-w-[200px] bg-transparent border-b-2 border-white/30 focus:border-white text-3xl font-bold focus:outline-none text-white placeholder-white/50" 
                        autoFocus 
                    />
                    <button 
                        onClick={handleUpdateGlobal} 
                        disabled={isSaving} 
                        className="ml-2 bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                    >
                        Save
                    </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsEditingGlobal(true)}>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight truncate">
                            #{currentGlobal.toLocaleString()}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30 p-1.5 rounded-full">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* Progress Bar Area */}
          <div className="mt-6 space-y-2">
            <div className="flex flex-col sm:flex-row justify-between text-xs font-medium text-indigo-100/70 gap-1">
              <span>
                 {activeTab === 'monthly' ? 'Allocated via Categories:' : 'Projected Annual Spend:'} 
                 <span className="text-white ml-1">#{allocatedComparison.toLocaleString()}</span>
              </span>
              <span className={isOverBudget ? "text-red-200 font-bold" : "text-emerald-200"}>
                {isOverBudget 
                    ? `⚠️ Over by #${Math.abs(unallocated).toLocaleString()}` 
                    : `Remaining: #${unallocated.toLocaleString()}`
                }
              </span>
            </div>
            
            <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-lg ${isOverBudget ? 'bg-red-400' : 'bg-emerald-400'}`} 
                style={{ width: `${percentUsed}%` }}
              ></div>
            </div>
            
            {activeTab === 'yearly' && (
                <p className="text-[10px] text-indigo-200/60 mt-2 italic">
                    * Comparing Annual Goal vs (Current Monthly × 12)
                </p>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: ADD CATEGORY */}
      <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center mb-3">
             <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
               Monthly Category Splits
             </h4>
             {activeTab === 'yearly' && (
                 <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                     Repeating Monthly
                 </span>
             )}
        </div>
        
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
           <div className="flex-1">
            <input 
               type="text" 
               placeholder="Category Name" 
               value={catName} 
               onChange={(e) => setCatName(e.target.value)} 
               className="w-full rounded-lg border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-3 outline-none" 
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
               className="w-full rounded-lg border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 pl-7 outline-none" 
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

      {/* SECTION 3: LIST */}
       {budgets.length > 0 && (
        <section className="space-y-3">
          {budgets.map((budget) => (
             <div key={budget.id} className="group flex items-center justify-between p-3 bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all duration-200">
                {/* Left Side */}
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-700 text-sm truncate">{budget.category}</p>
                        <p className="text-xs text-slate-400">Monthly Limit</p>
                    </div>
                </div>

                {/* Right Side Logic */}
                 <div className="flex items-center gap-2 sm:gap-3 pl-2">
                   {editingId === budget.id ? (
                        <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-16 sm:w-20 text-right bg-slate-50 rounded border border-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 py-1 px-1 sm:px-2 text-sm font-bold text-slate-800 outline-none"
                                autoFocus
                            />
                            <button onClick={() => saveEdit(budget.category)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </div>
                   ) : (
                       <>
                           <p className="font-bold text-slate-700 text-sm sm:text-base">#{budget.limit.toLocaleString()}</p>
                           <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                                <button onClick={() => startEditing(budget)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </button>
                                <button onClick={() => handleDelete(budget.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md">
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