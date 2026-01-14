import type { Metadata } from "next";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
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
        <Providers>
          <Toaster position="bottom-center" />
          <Navbar />
          
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}