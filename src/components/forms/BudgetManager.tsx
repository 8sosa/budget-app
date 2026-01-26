"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { copyPreviousMonthBudgets } from "@/app/actions/budget";
import { updateGlobalBudget, saveCategoryBudget, deleteBudget } from "@/app/actions/budget";

type Budget = {
  id: string;
  category: string;
  limit: number;
};

type Props = {
  viewMode: 'monthly' | 'yearly'; 
  monthlyBudget: number;
  yearlyBudget: number;
  budgets: Budget[];
  currentMonth: number;
  currentYear: number;
  currencySymbol: string;
  canImportPrevious?: boolean;
};

export default function BudgetManager({ 
  viewMode, 
  monthlyBudget, 
  yearlyBudget, 
  budgets, 
  currentMonth, 
  currentYear,
  currencySymbol,
  canImportPrevious
}: Props) {
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // --- STATE ---
  const [isEditingGlobal, setIsEditingGlobal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showTips, setShowTips] = useState(true);

  // Temporary state for inputs
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
  }, [monthlyBudget, yearlyBudget]);

  // --- NAVIGATION LOGIC ---
  const switchView = (mode: 'monthly' | 'yearly') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', mode);
    router.push(`?${params.toString()}`);
    setIsEditingGlobal(false);
  };

  // --- CALCULATIONS ---
  const totalMonthlyAllocated = budgets.reduce((sum, b) => sum + b.limit, 0);
  
  // 1. Determine which Global Cap to show
  const currentGlobal = viewMode === 'monthly' ? tempMonthly : tempYearly;
  
  // 2. Determine which "Allocated" amount to compare against
  // If Monthly: Use simple sum of categories
  // If Yearly: Use (Sum of Categories * 12)
  const allocatedComparison = viewMode === 'monthly' 
    ? totalMonthlyAllocated 
    : totalMonthlyAllocated * 12;

  const unallocated = currentGlobal - allocatedComparison;
  
  const percentUsed = currentGlobal > 0 
    ? Math.min(100, (allocatedComparison / currentGlobal) * 100) 
    : 0;
    
  const isOverBudget = unallocated < 0;

  // --- ACTIONS ---
  const handleImport = async () => {
    setIsImporting(true);
    try {
      await copyPreviousMonthBudgets(currentMonth, currentYear);
      router.refresh(); 
    } catch (error) {
      console.error("Failed to import budgets", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUpdateGlobal = async () => {
    setIsSaving(true);
    const amount = Number(viewMode === 'monthly' ? tempMonthly : tempYearly);
    
    if (viewMode === 'monthly') {
        const updateMonthly = updateGlobalBudget(amount, 'monthly', currentMonth, currentYear);
        const newYearly = amount * 12;
        setTempYearly(newYearly); 
        const updateYearly = updateGlobalBudget(newYearly, 'yearly', currentMonth, currentYear);
        await Promise.all([updateMonthly, updateYearly]);
    } else {
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
      
      {/* --- TIPS SECTION --- */}
      {showTips && (
        <div className="relative bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <button 
                onClick={() => setShowTips(false)}
                className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <div className="flex gap-3">
                <div className="mt-0.5 text-blue-500">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a6 6 0 0 1 6 6c0 7-9 13-9 13S3 15 3 8a6 6 0 0 1 6-6Z"/><path d="M11 14h2"/><path d="M12 17v.01"/></svg>
                </div>
                <div className="space-y-2">
                    <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                        {viewMode === 'yearly' ? 'Yearly Planning Tips' : 'Monthly Budgeting Tips'}
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1.5 list-disc pl-4">
                        {viewMode === 'monthly' ? (
                            <>
                                <li><strong>Global Cap:</strong> Your spending ceiling for this month.</li>
                                <li><strong>Categories:</strong> Allocate your cap into specific buckets (Rent, Food).</li>
                                {canImportPrevious && <li><strong>Import:</strong> Copy setup from last month.</li>}
                            </>
                        ) : (
                            <>
                                <li><strong>Yearly Goal:</strong> Your total spending target for the year.</li>
                                <li><strong>Analysis:</strong> Categories show projected yearly allocations (Monthly x 12).</li>
                                <li><strong>Editing:</strong> To edit specific category amounts, switch back to Monthly view.</li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </div>
      )}
      
      {!showTips && (
        <div className="flex justify-end">
            <button onClick={() => setShowTips(true)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Show Tips
            </button>
        </div>
      )}

      {/* SECTION 1: GLOBAL CAP */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent/50 text-primary-foreground shadow-lg transition-all duration-500">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/20 blur-xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-20 w-20 rounded-full bg-accent/20 blur-xl"></div>
        
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-xs font-bold tracking-widest uppercase opacity-80">
              {viewMode === 'monthly' ? 'Monthly Spending Limit' : 'Annual Spending Goal'}
            </h3>
            
            {/* View Toggle */}
            <div className="flex bg-black/20 rounded-lg p-1 self-start sm:self-auto backdrop-blur-sm">
              <button
                onClick={() => switchView('monthly')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-background text-foreground shadow' : 'text-primary-foreground/70 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => switchView('yearly')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'yearly' ? 'bg-background text-foreground shadow' : 'text-primary-foreground/70 hover:text-white'}`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="w-full">
                {isEditingGlobal ? (
                    <div className="flex items-center gap-3 animate-in fade-in duration-200">
                        <span className="text-2xl font-bold opacity-50">{currencySymbol}</span>
                        <input 
                            type="number" 
                            value={viewMode === 'monthly' ? tempMonthly : tempYearly} 
                            onChange={(e) => viewMode === 'monthly' ? setTempMonthly(parseFloat(e.target.value)) : setTempYearly(parseFloat(e.target.value))} 
                            className="w-full max-w-[200px] bg-transparent border-b-2 border-white/30 focus:border-white text-3xl font-bold focus:outline-none placeholder-white/50" 
                            autoFocus 
                        />
                        <button 
                            onClick={handleUpdateGlobal} 
                            disabled={isSaving} 
                            className="ml-2 bg-background text-foreground hover:bg-muted px-4 py-2 rounded-lg text-sm font-bold shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsEditingGlobal(true)}>
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight truncate">
                            {currencySymbol}{currentGlobal.toLocaleString()}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30 p-1.5 rounded-full text-white">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                    </div>
                )}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex flex-col sm:flex-row justify-between text-xs font-medium opacity-80 gap-1">
              <span>
                 {viewMode === 'monthly' ? 'Total Allocated:' : 'Projected Annual Allocation:'} 
                 <span className="font-bold ml-1">{currencySymbol}{allocatedComparison.toLocaleString()}</span>
              </span>
              <span className={isOverBudget ? "text-red-200 font-bold" : "text-emerald-100 font-bold"}>
                {isOverBudget 
                    ? `⚠️ Over by ${currencySymbol}${Math.abs(unallocated).toLocaleString()}` 
                    : `Remaining: ${currencySymbol}${unallocated.toLocaleString()}`
                }
              </span>
            </div>
            
            <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ease-out shadow-lg ${isOverBudget ? 'bg-red-400' : 'bg-secondary'}`} 
                style={{ width: `${percentUsed}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPORT PROMPT */}
      {viewMode === 'monthly' && canImportPrevious && budgets.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-indigo-900">Start from last month?</p>
              <p className="text-xs text-indigo-700">Copy your categories and limits from the previous month.</p>
            </div>
          </div>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="whitespace-nowrap px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isImporting ? "Importing..." : "Import Budgets"}
          </button>
        </div>
      )}

      {/* SECTION 2: ADD CATEGORY (Monthly Only) */}
      {viewMode === 'monthly' ? (
          <section className="bg-muted/30 p-4 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Monthly Category Splits
                </h4>
            </div>
            
            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
                <input 
                type="text" 
                placeholder="Category Name" 
                value={catName} 
                onChange={(e) => setCatName(e.target.value)} 
                className="placeholder:text-slate-500 w-full rounded-lg border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary text-sm py-2.5 px-3 outline-none transition-all" 
                required 
                />
            </div>
            <div className="w-full sm:w-32 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-muted-foreground text-xs font-bold">{currencySymbol}</span>
                </div>
                <input 
                type="number" 
                placeholder="Limit" 
                value={catLimit} 
                onChange={(e) => setCatLimit(e.target.value)} 
                className="placeholder:text-slate-500 w-full rounded-lg border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary text-sm py-2.5 pl-7 outline-none transition-all" 
                required 
                />
            </div>
            <div>
                <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full sm:w-auto h-[42px] px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                {isSaving ? "..." : "Add"}
                </button>
            </div>
            </form>
        </section>
      ) : (
        <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border">
             <p className="text-sm text-muted-foreground">
                These are your <strong>projected yearly totals</strong> (Monthly × 12).
                <br />Switch to Monthly view to edit.
            </p>
        </div>
      )}

      {/* SECTION 3: LIST */}
       {budgets.length > 0 && (
        <section className="space-y-3">
          {budgets.map((budget) => (
             <div key={budget.id} className="group flex items-center justify-between p-3 bg-card rounded-xl border border-transparent hover:border-border hover:shadow-sm transition-all duration-200">
                {/* Left Side */}
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{budget.category}</p>
                        <p className="text-xs text-muted-foreground">
                            {viewMode === 'monthly' ? "Monthly Limit" : "Yearly Projection"}
                        </p>
                    </div>
                </div>

                {/* Right Side Logic */}
                 <div className="flex items-center gap-2 sm:gap-3 pl-2">
                   {viewMode === 'monthly' && editingId === budget.id ? (
                        <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-16 sm:w-20 text-right bg-background rounded border border-primary focus:border-primary focus:ring-1 focus:ring-primary py-1 px-1 sm:px-2 text-sm font-bold text-foreground outline-none"
                                autoFocus
                            />
                            <button onClick={() => saveEdit(budget.category)} className="text-secondary hover:bg-secondary/10 p-1.5 rounded-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:bg-muted p-1.5 rounded-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                        </div>
                   ) : (
                       <>
                           <p className="font-bold text-foreground text-sm sm:text-base">
                             {/* 👇 THIS IS THE KEY FIX FOR CATEGORY SPLITS */}
                             {currencySymbol}
                             {(viewMode === 'monthly' ? budget.limit : budget.limit * 12).toLocaleString()}
                           </p>
                           {viewMode === 'monthly' && (
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                                        <button onClick={() => startEditing(budget)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button onClick={() => handleDelete(budget.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                </div>
                           )}
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