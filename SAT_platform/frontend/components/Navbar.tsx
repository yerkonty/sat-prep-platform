"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const navRef = useRef<HTMLElement>(null);

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
        { href: "/ai-tutor", label: "AI Tutor" },
        { href: "/flashcards", label: "Flashcards" },
        { href: "/progress", label: "Progress" },
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
                                <Link href="/profile" className="text-sm font-bold text-[#1A1A1A]/70 hover:text-[#00592B] transition-colors hover:-translate-y-0.5 inline-block">
                                    Profile
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-sm font-bold text-[#1A1A1A]/70 hover:text-[#10B981] transition-colors hover:-translate-y-0.5"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="text-sm font-bold text-[#1A1A1A]/80 hover:text-[#00592B] transition-colors relative group">
                                    Log in
                                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#00592B] transition-all group-hover:w-full"></span>
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center px-6 py-2.5 rounded-full shadow-lg shadow-[#10B981]/20 text-sm font-bold text-[#FAFAF8] bg-[#00592B] hover:bg-[#10B981] hover:-translate-y-0.5 transition-all duration-300 active:scale-95"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
