"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast"; // Ideally install react-hot-toast, or use alert()

export default function AuthPage() {
  const session = useSession();
  const router = useRouter();
  const [variant, setVariant] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (session?.status === "authenticated") {
      router.push("/dashboard");
    }
  }, [session?.status, router]);

  const toggleVariant = () => {
    setVariant((prev) => (prev === "LOGIN" ? "REGISTER" : "LOGIN"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (variant === "REGISTER") {
      // Register Logic
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        if (res.ok) {
          // If register success, immediately log them in
          await signIn("credentials", { email, password, redirect: false });
          router.push("/dashboard");
        } else {
            const error = await res.json();
            alert(error.error || "Registration failed");
        }
      } catch (error) {
        alert("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Login Logic
      const callback = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (callback?.error) {
        alert("Invalid credentials");
      }

      if (callback?.ok && !callback?.error) {
        router.push("/dashboard");
      }
      setIsLoading(false);
    }
  };

  const socialAction = (action: string) => {
    setIsLoading(true);
    signIn(action, { callbackUrl: "/dashboard" })
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      
      {/* HEADER LOGO */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-center">
             <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
             </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {variant === "LOGIN" ? "Sign in to your account" : "Create your account"}
        </h2>
      </div>

      {/* FORM CARD */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow-xl shadow-slate-200 sm:rounded-xl sm:px-10 border border-slate-100">
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* NAME INPUT (Register only) */}
            {variant === "REGISTER" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-lg border-gray-300 bg-slate-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* EMAIL INPUT */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-lg border-gray-300 bg-slate-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-lg border-gray-300 bg-slate-50 p-2.5 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all"
              >
                {variant === "LOGIN" ? "Sign in" : "Register"}
              </button>
            </div>
          </form>

          {/* SOCIAL LOGIN DIVIDER */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => socialAction("google")}
                className="inline-flex w-full justify-center rounded-lg bg-white px-4 py-2 text-gray-500 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0 transition-all"
              >
                <svg className="h-5 w-5 mr-2" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12.0003 20.45c4.6667 0 8.45-3.7833 8.45-8.45 0-.4167-.0334-.8167-.1-1.2h-8.35v2.4h4.7834c-.2 1.0833-1.1 3.1333-4.7834 3.1333-2.8833 0-5.2333-2.35-5.2333-5.2333s2.35-5.2333 5.2333-5.2333c1.2333 0 2.3333.4333 3.2 1.25l1.7833-1.7833C15.8669 4.2667 14.0669 3.55 12.0003 3.55c-4.6667 0-8.45 3.7833-8.45 8.45s3.7833 8.45 8.45 8.45z" fill="currentColor" />
                </svg>
                Google
              </button>
            </div>
          </div>

          {/* TOGGLE VARIANT */}
          <div className="flex gap-2 justify-center text-sm mt-6 px-2 text-gray-500">
            <div>
              {variant === "LOGIN" ? "New to BudgetAI?" : "Already have an account?"}
            </div>
            <div 
              onClick={toggleVariant} 
              className="underline cursor-pointer text-indigo-600 hover:text-indigo-500 font-medium"
            >
              {variant === "LOGIN" ? "Create an account" : "Login"}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}