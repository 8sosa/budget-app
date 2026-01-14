import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-sans">
      
      {/* --- HERO SECTION --- */}
      <main className="flex flex-col items-center justify-center w-full max-w-5xl px-6 pt-20 pb-16 text-center sm:pt-32">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6 dark:bg-green-900 dark:text-green-300">
          ✨ Now with AI Receipt Scanning
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6">
          Master your money <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
            without the headache.
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Stop manually typing expenses into spreadsheets. Just snap a photo of your receipt, 
          and let our AI organize your budget instantly.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/dashboard"
            className="flex items-center justify-center h-12 px-8 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all"
          >
            Get Started for Free
          </Link>
          <a
            href="#features"
            className="flex items-center justify-center h-12 px-8 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all font-medium"
          >
            How it works
          </a>
        </div>
      </main>

      {/* --- VISUAL DEMO (Abstract Representation) --- */}
      <section className="w-full max-w-5xl px-6 mb-24">
        <div className="relative rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 sm:p-8 shadow-xl overflow-hidden">
          {/* A simple visual representation of the dashboard */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 bg-white dark:bg-black p-3 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-800">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">🧾</div>
                <div>
                  <p className="text-xs text-gray-500">Scanned Receipt</p>
                  <p className="font-bold text-sm">Grocery Store • $42.50</p>
                </div>
                <div className="ml-auto text-green-600 text-xs font-bold">Processed</div>
              </div>
              <div className="flex items-center space-x-3 bg-white dark:bg-black p-3 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-800 opacity-80">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl">☕</div>
                <div>
                  <p className="text-xs text-gray-500">Manual Entry</p>
                  <p className="font-bold text-sm">Coffee Shop • $5.00</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
              <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-2">Monthly Spending</h3>
              <div className="flex items-end space-x-2 h-32">
                <div className="w-1/4 bg-green-200 h-[40%] rounded-t-sm"></div>
                <div className="w-1/4 bg-green-300 h-[60%] rounded-t-sm"></div>
                <div className="w-1/4 bg-green-400 h-[30%] rounded-t-sm"></div>
                <div className="w-1/4 bg-green-600 h-[80%] rounded-t-sm relative group">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition">
                    $840
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="w-full max-w-5xl px-6 py-16 border-t border-gray-100 dark:border-zinc-900">
        <div className="grid md:grid-cols-3 gap-10">
          
          {/* Feature 1 */}
          <div className="space-y-3">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-2xl text-blue-600">
              📸
            </div>
            <h3 className="text-xl font-bold">Scan & Go</h3>
            <p className="text-gray-500 leading-relaxed">
              Upload a photo of any receipt. Our AI extracts the merchant, date, and total automatically.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-2xl text-green-600">
              📊
            </div>
            <h3 className="text-xl font-bold">Visual Insights</h3>
            <p className="text-gray-500 leading-relaxed">
              See exactly where your money goes with beautiful, interactive charts and monthly breakdowns.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="space-y-3">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center text-2xl text-purple-600">
              🔒
            </div>
            <h3 className="text-xl font-bold">Secure & Private</h3>
            <p className="text-gray-500 leading-relaxed">
              Your data is encrypted and stored securely. Sign in with Google for peace of mind.
            </p>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="w-full py-10 text-center text-sm text-gray-400 border-t border-gray-100 dark:border-zinc-900 mt-auto">
        <p>&copy; {new Date().getFullYear()} BudgetAI. All rights reserved.</p>
      </footer>
    </div>
  );
}