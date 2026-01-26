"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface CategoryFilterProps {
  categories: string[];
}

export default function CategoryFilter({ categories }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentCategory = searchParams.get("category") || "";

  const handleFilterChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (category && category !== "all") {
      params.set("category", category);
    } else {
      params.delete("category"); // Remove param for "All"
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      value={currentCategory}
      onChange={(e) => handleFilterChange(e.target.value)}
      className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
    >
      <option value="all">All Categories</option>
      {categories.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
}