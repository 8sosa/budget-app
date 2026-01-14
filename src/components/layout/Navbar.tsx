import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SignOutButton from "../ui/SignOutButton";

export default async function Navbar() {
  const session = await getServerSession(authOptions);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        
        {/* BRAND LOGO */}
        <Link 
          href="/dashboard" 
          className="group flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          {/* Logo Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          {/* Logo Text */}
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Budget<span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">AI</span>
          </span>
        </Link>

        {/* USER INFO & ACTIONS */}
        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              {/* User Details (Hidden on mobile) */}
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-slate-400">Signed in as</p>
                <p className="text-sm font-bold text-slate-700 leading-tight">
                  {session.user.name || session.user.email}
                </p>
              </div>
              
              {/* Avatar */}
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-slate-200 shadow-sm ring-2 ring-transparent transition-all hover:ring-indigo-100">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={session.user.image} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-indigo-600 font-bold text-xs">
                    {session.user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="mx-1 h-6 w-px bg-slate-200"></div>
              
              {/* Sign Out Button */}
              <SignOutButton />
            </>
          ) : (
            <Link 
              href="/api/auth/signin" 
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 shadow-sm"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}