"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
    LayoutDashboard,
    BotMessageSquare,
    BookOpen,
    LogOut,
    Fingerprint,
    CreditCard,
    PiggyBank,
    Target,
    TrendingUp,
    Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/spend-analysis", label: "Spending", icon: CreditCard },
    { href: "/savings", label: "Savings", icon: PiggyBank },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/simulator", label: "Simulator", icon: TrendingUp },
    { href: "/advisor", label: "AI Copilot", icon: BotMessageSquare },
    { href: "/literacy", label: "Learn", icon: BookOpen },
    { href: "/services", label: "Services", icon: Briefcase },
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
                    <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                            <Fingerprint className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-lg font-bold tracking-tight hidden lg:inline">
                            <span className="text-gradient">Arth</span>
                            <span className="text-[var(--color-text-primary)]">Niti</span>
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap",
                                        isActive
                                            ? "text-blue-300"
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-active"
                                            className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                                            transition={{
                                                type: "spring",
                                                stiffness: 380,
                                                damping: 30,
                                            }}
                                        />
                                    )}
                                    <Icon className="w-3.5 h-3.5 relative z-10" />
                                    <span className="relative z-10 hidden md:inline">
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={() => {
                            localStorage.removeItem("session_token");
                            localStorage.removeItem("user_id");
                            localStorage.removeItem("username");
                            localStorage.removeItem("onboarding_profile");
                            localStorage.removeItem("ghr_risk_profile");
                            window.location.href = "/auth";
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-sm flex-shrink-0 cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden lg:inline">Sign Out</span>
                    </button>
                </div>
            </div>
        </motion.nav>
    );
}
