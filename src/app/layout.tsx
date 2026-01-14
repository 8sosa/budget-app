import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar"; // <--- Import it

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Budget Tracker",
  description: "Track your expenses with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Add the Navbar here, above the children */}
        <Navbar />
        
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}