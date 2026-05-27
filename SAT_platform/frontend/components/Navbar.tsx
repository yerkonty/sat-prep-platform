"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    BarChart3,
    BookOpen,
    Bot,
    ClipboardList,
    Layers,
    LayoutDashboard,
    LogOut,
    Menu,
    Moon,
    Shield,
    Trophy,
    X,
} from "lucide-react";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/practice", label: "Practice", icon: BookOpen },
    { href: "/test", label: "Practice Test", icon: ClipboardList },
    { href: "/ai-tutor", label: "AI Tutor", icon: Bot },
    { href: "/flashcards", label: "Flashcards", icon: Layers },
    { href: "/progress", label: "Progress", icon: BarChart3 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const HIDDEN_ROUTES = ["/practice/session", "/test/session"];

function UserAvatar({ name }: { name: string }) {
    const initial = (name || "S").charAt(0).toUpperCase();
    return (
        <div className="w-8 h-8 rounded-full bg-highlight/20 flex items-center justify-center text-sm font-bold text-highlight shrink-0">
            {initial}
        </div>
    );
}

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isHidden = HIDDEN_ROUTES.some((r) => pathname.startsWith(r));
    if (!user || isHidden) {
        if (!user && !isHidden) {
            return (
                <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
                    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
                        <Link href="/" className="flex items-center gap-2 text-lg font-black text-primary tracking-tighter">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-highlight to-accent flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                M
                            </div>
                            MaxSAT
                        </Link>
                        <Link
                            href="/login"
                            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-accent transition-colors active:scale-[0.97]"
                        >
                            Log in
                        </Link>
                    </div>
                </nav>
            );
        }
        return null;
    }

    const navLinks = [
        ...NAV_ITEMS,
        ...(user.role === "admin" ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    ];

    const sidebarContent = (mobile: boolean) => (
        <>
            {/* Logo */}
            <Link
                href="/dashboard"
                onClick={mobile ? () => setMobileOpen(false) : undefined}
                className="flex items-center gap-2.5 px-5 h-14 shrink-0"
            >
                <div className="w-7 h-7 rounded-lg bg-highlight flex items-center justify-center text-primary font-bold text-sm">
                    M
                </div>
                <span className="text-lg font-black text-white tracking-tighter">MaxSAT</span>
            </Link>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto pt-4 pb-2 px-3 space-y-0.5">
                {navLinks.map((link) => {
                    const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href + "/"));
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={mobile ? () => setMobileOpen(false) : undefined}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color] duration-[var(--dur)] ease-[var(--ease)] ${
                                isActive
                                    ? "bg-white/15 text-white font-semibold"
                                    : "text-white/60 hover:text-white hover:bg-white/8"
                            }`}
                        >
                            <Icon className="w-[18px] h-[18px] shrink-0" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 pb-3 space-y-3">
                {/* User row */}
                <Link
                    href="/profile"
                    onClick={mobile ? () => setMobileOpen(false) : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        pathname === "/profile"
                            ? "bg-white/15 text-white"
                            : "text-white/60 hover:text-white hover:bg-white/8"
                    }`}
                >
                    <UserAvatar name={user.name} />
                    <span className="text-sm font-medium truncate">{user.name || "Profile"}</span>
                </Link>

                {/* Actions row */}
                <div className="flex items-center gap-1 px-1">
                    <button
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
                        title="Dark mode coming soon"
                    >
                        <Moon className="w-4 h-4" />
                        Dark mode
                    </button>
                    <button
                        onClick={() => { logout(); if (mobile) setMobileOpen(false); }}
                        className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/40 hover:text-red-300 hover:bg-white/8 transition-colors active:scale-[0.97]"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[220px] flex-col bg-primary">
                {sidebarContent(false)}
            </aside>

            {/* ── Mobile Top Bar ── */}
            <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-primary flex items-center justify-between px-4">
                <Link href="/dashboard" className="flex items-center gap-2 text-lg font-black text-white tracking-tighter">
                    <div className="w-7 h-7 rounded-lg bg-highlight flex items-center justify-center text-primary font-bold text-sm">
                        M
                    </div>
                    MaxSAT
                </Link>
                <button
                    onClick={() => setMobileOpen((v) => !v)}
                    className="p-2 rounded-lg text-white/70 hover:bg-white/10 transition-[transform,background-color] duration-[var(--dur)] ease-[var(--ease)] active:scale-[0.97]"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </header>

            {/* ── Mobile Overlay ── */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-50 overlay-enter" onClick={() => setMobileOpen(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <aside
                        className="absolute left-0 top-0 bottom-0 w-[260px] bg-primary shadow-2xl flex flex-col sidebar-enter"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {sidebarContent(true)}
                    </aside>
                </div>
            )}
        </>
    );
}
