"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const FULL_SCREEN_ROUTES = ["/practice/session", "/test/session"];
const PUBLIC_ROUTES = ["/", "/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const isFullScreen = FULL_SCREEN_ROUTES.some((r) => pathname.startsWith(r));
    const isPublic = PUBLIC_ROUTES.includes(pathname) || pathname.startsWith("/join/");
    const hasSidebar = !!user && !isFullScreen;
    let className = "";
    if (hasSidebar) {
        className = "md:ml-[220px] pt-14 md:pt-0";
    } else if (!user && isPublic) {
        className = "pt-14";
    }

    return <div className={className}>{children}</div>;
}
