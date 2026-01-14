import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* We can add a Navigation Bar here later */}
      <main>
        {children}
      </main>
    </div>
  );
}