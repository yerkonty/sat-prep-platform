"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import gsap from "gsap";

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const navRef = useRef<HTMLElement>(null);
    const [mobileOpen, setMobileOpen] = useState(false);
    const closeMobile = () => setMobileOpen(false);

    useEffect(() => {
        if (navRef.current) {
            gsap.fromTo(
                navRef.current,
                { y: -100, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
            );
        }
    }, []);

    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/practice", label: "Practice" },
        { href: "/test", label: "Practice Test" },
        { href: "/ai-tutor", label: "AI Tutor" },
        { href: "/flashcards", label: "Flashcards" },
        { href: "/progress", label: "Progress" },
        { href: "/leaderboard", label: "Leaderboard" },
        ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
    ];

    return (
        <nav ref={navRef} className="bg-[#FAFAF8]/90 backdrop-blur-xl border-b border-[#00592B]/10 sticky top-0 z-50 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="text-2xl font-black text-[#00592B] tracking-tighter flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1CE585] to-[#10B981] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#1CE585]/30 group-hover:scale-105 transition-transform duration-300">
                                O
                            </div>
                            <span className="group-hover:opacity-80 transition-opacity">MaxSAT</span>
                        </Link>
                        {user && (
                            <div className="hidden md:flex space-x-2">
                                {navLinks.map((link) => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${isActive
                                                    ? "bg-[#00592B] text-[#FAFAF8] shadow-md shadow-[#00592B]/20"
                                                    : "text-[#1A1A1A]/70 hover:text-[#00592B] hover:bg-[#00592B]/5"
                                                }`}
                                        >
                                            {link.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <span className="text-sm font-bold text-[#1A1A1A]/80 hidden sm:block bg-[#00592B]/5 px-3 py-1.5 rounded-full">
                                    {user.name || "Student"}
                                </span>
                                <Link href="/profile" className="hidden sm:inline-block text-sm font-bold text-[#1A1A1A]/70 hover:text-[#00592B] transition-colors hover:-translate-y-0.5">
                                    Profile
                                </Link>
                                <button
                                    onClick={logout}
                                    className="hidden sm:inline-block text-sm font-bold text-[#1A1A1A]/70 hover:text-[#10B981] transition-colors hover:-translate-y-0.5"
                                >
                                    Logout
                                </button>
                                <button
                                    onClick={() => setMobileOpen((v) => !v)}
                                    className="md:hidden p-2 rounded-lg text-[#1A1A1A]/70 hover:bg-[#00592B]/5 transition-colors"
                                    aria-label="Toggle menu"
                                >
                                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </button>
                            </>
                        ) : (
                            <Link href="/login" className="inline-flex items-center px-6 py-2.5 rounded-full shadow-lg shadow-[#10B981]/20 text-sm font-bold text-[#FAFAF8] bg-[#00592B] hover:bg-[#10B981] hover:-translate-y-0.5 transition-all duration-300 active:scale-95">
                                Log in
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {user && mobileOpen && (
                <div className="md:hidden border-t border-[#00592B]/10 bg-[#FAFAF8] px-4 pb-4 pt-2 space-y-1">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMobile}
                                className={`block px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                    isActive
                                        ? "bg-[#00592B] text-[#FAFAF8]"
                                        : "text-[#1A1A1A]/70 hover:bg-[#00592B]/5"
                                }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                    <div className="border-t border-[#00592B]/10 pt-2 mt-2 flex items-center justify-between px-4">
                        <Link href="/profile" onClick={closeMobile} className="text-sm font-bold text-[#1A1A1A]/70 hover:text-[#00592B] transition-colors">
                            Profile
                        </Link>
                        <button
                            onClick={logout}
                            className="text-sm font-bold text-[#1A1A1A]/70 hover:text-[#10B981] transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
