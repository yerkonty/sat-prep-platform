import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import AppShell from "@/components/AppShell";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MaxSAT — Digital SAT Prep",
  description: "AI-powered Digital SAT preparation. Practice with real questions, get instant feedback, and track your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans bg-background text-foreground`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg">
          Skip to content
        </a>
        <Providers>
          <Navbar />
          <AppShell>
            <main id="main-content" className="min-h-screen">{children}</main>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
