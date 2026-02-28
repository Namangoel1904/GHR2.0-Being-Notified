"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    Shield,
    LayoutDashboard,
    BotMessageSquare,
    BookOpen,
    LogOut,
    Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/advisor", label: "AI Advisor", icon: BotMessageSquare },
    { href: "/onboarding", label: "Risk Profile", icon: Shield },
    { href: "/literacy", label: "Learn", icon: BookOpen },
];

export default function Navbar() {
    const pathname = usePathname();

    return (
        <motion.nav
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
        >
            <div className="mx-auto max-w-7xl">
                <div className="glass-strong rounded-2xl px-6 py-3 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/dashboard" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                            <Fingerprint className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-lg font-bold tracking-tight">
                            <span className="text-gradient">Fin</span>
                            <span className="text-[var(--color-text-primary)]">Aegis</span>
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                                        isActive
                                            ? "text-emerald-300"
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-active"
                                            className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                                            transition={{
                                                type: "spring",
                                                stiffness: 380,
                                                damping: 30,
                                            }}
                                        />
                                    )}
                                    <Icon className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10 hidden md:inline">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Logout */}
                    <Link
                        href="/auth"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden md:inline">Sign Out</span>
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}
