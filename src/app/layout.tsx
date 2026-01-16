import type { Metadata } from "next";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Track your expenses. Manage your budget effectively.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 1. ADD 'suppressHydrationWarning' here.
    // This stops the error about the extra attributes next-themes adds to <html>
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* 2. ADD 'attribute="class"' and 'defaultTheme'.
             Tailwind needs attribute="class" to make dark mode work. */}
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <Providers>
            <Toaster position="bottom-center" />
            <Navbar />
            
            <main>
              {children}
            </main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}