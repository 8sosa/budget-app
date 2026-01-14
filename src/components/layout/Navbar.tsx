import Link from "next/link";
import UserAccountNav from "../ui/UserAccountNav";

export default function Navbar() {
  // No need for getServerSession here anymore!
  
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        
        {/* BRAND LOGO */}
        <Link 
          href="/" 
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Budget<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">AI</span>
          </span>
        </Link>

        {/* USER INFO & ACTIONS */}
        <div className="flex items-center gap-4">
           {/* We delegate the logic to this client component */}
           <UserAccountNav /> 
        </div>
      </div>
    </nav>
  );
}