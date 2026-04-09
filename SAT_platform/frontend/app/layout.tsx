import type { Metadata } from "next";
import { Inter_Tight, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SAT Prep Platform",
  description: "AI-powered Digital SAT preparation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} ${inter.variable} font-sans`}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
