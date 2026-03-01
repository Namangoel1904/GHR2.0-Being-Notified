"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ShieldCheck,
    Scale,
    TrendingUp,
    AlertTriangle,
    Zap,
    Target,
    LineChart,
    Coins
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// --- TYPES & INTERFACES -----------------------------------------------------

type PersonaType =
    | "Safety-First Saver"
    | "Balanced Planner"
    | "Risk-Taking Optimizer"
    | "Financially Vulnerable"
    | "Impulsive Spender"
    | "Goal-Focused Accumulator"
    | "Analyzing...";

interface PersonaConfig {
    name: PersonaType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    color: string;
    description: string;
    allocations: { safety: number; growth: number; liquidity: number };
}

const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
    "Safety-First Saver": {
        name: "Safety-First Saver",
        icon: ShieldCheck,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        description: "You prioritize security over growth. You sleep best knowing you have a large buffer against financial uncertainty.",
        allocations: { safety: 65, growth: 25, liquidity: 10 }
    },
    "Balanced Planner": {
        name: "Balanced Planner",
        icon: Scale,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        description: "You maintain moderate savings and balanced spending. You're open to growth but demand a solid safety net first.",
        allocations: { safety: 40, growth: 40, liquidity: 20 }
    },
    "Risk-Taking Optimizer": {
        name: "Risk-Taking Optimizer",
        icon: TrendingUp,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        description: "You have strong income/savings. You are highly comfortable with short-term volatility to maximize long-term wealth.",
        allocations: { safety: 25, growth: 60, liquidity: 15 }
    },
    "Financially Vulnerable": {
        name: "Financially Vulnerable",
        icon: AlertTriangle,
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        description: "Your emergency fund is weak and expenses are high. Immediate priority must be building a financial safety net.",
        allocations: { safety: 80, growth: 0, liquidity: 20 }
    },
    "Impulsive Spender": {
        name: "Impulsive Spender",
        icon: Zap,
        color: "text-orange-500 bg-orange-500/10 border-orange-500/20",
        description: "Your discretionary spending is high with irregular saving habits. You need structured, automated savings rules.",
        allocations: { safety: 50, growth: 20, liquidity: 30 }
    },
    "Goal-Focused Accumulator": {
        name: "Goal-Focused Accumulator",
        icon: Target,
        color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
        description: "You have clear financial goals and disciplined tracking. You just need optimal asset allocation to hit targets faster.",
        allocations: { safety: 30, growth: 50, liquidity: 20 }
    },
    "Analyzing...": {
        name: "Analyzing...",
        icon: Zap,
        color: "text-gray-500 bg-gray-500/10 border-gray-500/20",
        description: "Gathering your financial data...",
        allocations: { safety: 0, growth: 0, liquidity: 0 }
    }
};

// --- RULE-BASED ENGINE ------------------------------------------------------

// Mock inputs for demonstration. In a real app, these come from DB/Auth context.
const MOCK_USER_METRICS = {
    monthlyIncome: 80000,
    monthlyExpenses: 55000,
    currentSavings: 120000, // Total corpus
    savingsRatePercentage: 31.25, // (80k - 55k) / 80k = 31.25%
    discretionarySpendRatio: 0.15, // 15% of income goes to wants
    tracksExpenses: true,
    hasLongTermGoals: true
};

function calculatePersona(metrics: typeof MOCK_USER_METRICS): { persona: PersonaType, reason: string } {
    const { savingsRatePercentage, currentSavings, monthlyExpenses, discretionarySpendRatio, tracksExpenses, hasLongTermGoals } = metrics;
    const monthsOfSafety = currentSavings / monthlyExpenses;

    // Rule 1: Financially Vulnerable
    if (savingsRatePercentage < 10 && monthsOfSafety < 1.5) {
        return {
            persona: "Financially Vulnerable",
            reason: "Savings rate < 10% and emergency fund covers less than 2 months."
        };
    }

    // Rule 2: Impulsive Spender
    if (discretionarySpendRatio > 0.30 && savingsRatePercentage < 15) {
        return {
            persona: "Impulsive Spender",
            reason: "High discretionary spend ratio (>30%) with fluctuating monthly savings."
        };
    }

    // Rule 3: Goal-Focused Accumulator
    if (savingsRatePercentage > 20 && tracksExpenses && hasLongTermGoals && monthsOfSafety >= 2) {
        return {
            persona: "Goal-Focused Accumulator",
            reason: "Consistent savings rate (>20%), strict expense tracking, and active goal timelines."
        };
    }

    // Rule 4: Risk-Taking Optimizer
    if (savingsRatePercentage > 35 && monthsOfSafety > 6) {
        return {
            persona: "Risk-Taking Optimizer",
            reason: "Very high savings capability (>35%) with a massive safety buffer already built."
        };
    }

    // Rule 5: Safety-First Saver
    if (monthsOfSafety > 6 && !hasLongTermGoals) {
        return {
            persona: "Safety-First Saver",
            reason: "Maintains a very large liquid emergency fund but limited growth-oriented investments."
        };
    }

    // Default: Balanced Planner
    return {
        persona: "Balanced Planner",
        reason: "Moderate savings rate + stable spending + medium emergency fund."
    };
}

export default function SavingsOptimizationPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState(MOCK_USER_METRICS);
    const [personaResult, setPersonaResult] = useState<{ persona: PersonaType, reason: string }>({ persona: "Analyzing...", reason: "" });

    useEffect(() => {
        const timer = setTimeout(() => {
            const result = calculatePersona(userData);
            setPersonaResult(result);
            setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, [userData]);

    const activeConfig = PERSONA_CONFIGS[personaResult.persona];
    const PersonaIcon = activeConfig.icon;

    const monthsOfSafety = parseFloat((userData.currentSavings / userData.monthlyExpenses).toFixed(1));
    const safetyColor = monthsOfSafety >= 6 ? "text-green-400" : monthsOfSafety >= 3 ? "text-yellow-400" : "text-red-400";
    const safetyProgress = Math.min((monthsOfSafety / 6) * 100, 100);

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 pt-24">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                        Savings <span className="text-gradient hover-glow">Optimization</span>
                    </h1>
                    <p className="text-[var(--color-text-muted)]">
                        AI-driven behavioral analysis and dynamic portfolio allocation.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("card p-6 border relative overflow-hidden", activeConfig.color.replace('text-', 'border-').split(' ')[0] + '/30')}
                        >
                            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full flex items-center justify-center opacity-10", activeConfig.color.split(' ')[1])}>
                                <PersonaIcon className="w-16 h-16" />
                            </div>

                            <p className="text-xs font-bold text-[var(--color-text-dim)] uppercase tracking-widest mb-4">Your Savings Persona</p>

                            {isLoading ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="h-8 bg-[var(--color-border)] rounded w-3/4"></div>
                                    <div className="h-4 bg-[var(--color-border)] rounded w-full"></div>
                                    <div className="h-4 bg-[var(--color-border)] rounded w-5/6"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={cn("p-2 rounded-xl", activeConfig.color)}>
                                            <PersonaIcon className="w-6 h-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                                            {activeConfig.name}
                                        </h2>
                                    </div>
                                    <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                                        {activeConfig.description}
                                    </p>
                                    <div className="bg-[var(--color-bg-primary)] p-3 rounded-lg border border-[var(--color-border)]">
                                        <p className="text-xs font-semibold text-blue-400 mb-1">AI Reasoning:</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">&quot;{personaResult.reason}&quot;</p>
                                    </div>
                                </>
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="card p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Emergency Runway</h3>
                                    <p className="text-xs text-[var(--color-text-muted)]">Months of financial safety</p>
                                </div>
                                <ShieldCheck className={cn("w-6 h-6", safetyColor)} />
                            </div>

                            <div className="flex items-end gap-2 mb-4">
                                <span className={cn("text-4xl font-black", safetyColor)}>{monthsOfSafety}</span>
                                <span className="text-[var(--color-text-dim)] mb-1 font-medium">Months</span>
                            </div>

                            <div className="h-3 w-full bg-[var(--color-bg-primary)] rounded-full overflow-hidden mb-2 border border-[var(--color-border)]">
                                <motion.div
                                    className={cn("h-full rounded-full", monthsOfSafety >= 6 ? "bg-green-500" : monthsOfSafety >= 3 ? "bg-yellow-500" : "bg-red-500")}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${safetyProgress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-[var(--color-text-dim)] font-medium uppercase tracking-wider mb-4">
                                <span>0</span>
                                <span>Target: 6+</span>
                            </div>

                            <div className={cn("p-3 rounded-lg text-xs font-medium border", monthsOfSafety >= 6 ? "bg-green-500/10 text-green-400 border-green-500/20" : monthsOfSafety >= 3 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-red-500/10 text-red-400 border-red-500/20")}>
                                {monthsOfSafety >= 6 ? "Excellent: You are fully protected against unexpected events." : monthsOfSafety >= 3 ? "Moderate: Building well, but aim for 6 months." : "High Risk: Only 1.2 months covered. Priority: Build safety net."}
                            </div>
                        </motion.div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="card p-6"
                        >
                            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Suggested Allocation</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-8">
                                Based on your <span className="text-blue-400 font-semibold">{activeConfig.name}</span> profile, we recommend splitting your monthly savings into these three buckets.
                            </p>

                            <div className="flex h-12 w-full rounded-xl overflow-hidden mb-6 border border-[var(--color-bg-primary)] shadow-inner">
                                <motion.div
                                    className="h-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${activeConfig.allocations.safety}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                >
                                    {activeConfig.allocations.safety}%
                                </motion.div>
                                <motion.div
                                    className="h-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${activeConfig.allocations.growth}%` }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                >
                                    {activeConfig.allocations.growth}%
                                </motion.div>
                                <motion.div
                                    className="h-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${activeConfig.allocations.liquidity}%` }}
                                    transition={{ duration: 1, delay: 0.7 }}
                                >
                                    {activeConfig.allocations.liquidity}%
                                </motion.div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                                        <h4 className="font-bold text-[var(--color-text-primary)]">Safety Bucket</h4>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-dim)] mb-3 h-8">Emergency funds and absolute capital protection.</p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] uppercase font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-1 rounded-md text-[var(--color-text-muted)]">FDs</span>
                                        <span className="text-[10px] uppercase font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-1 rounded-md text-[var(--color-text-muted)]">RDs</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.6)]"></div>
                                        <h4 className="font-bold text-[var(--color-text-primary)]">Growth Bucket</h4>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-dim)] mb-3 h-8">Long-term wealth creation instruments.</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] uppercase font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-1 rounded-md text-[var(--color-text-muted)]">Mutual Funds</span>
                                        <span className="text-[10px] uppercase font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-1 rounded-md text-[var(--color-text-muted)]">Stocks</span>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
                                        <h4 className="font-bold text-[var(--color-text-primary)]">Liquidity Bucket</h4>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-dim)] mb-3 h-8">Highly accessible cash for short-term needs.</p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] uppercase font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] px-2 py-1 rounded-md text-[var(--color-text-muted)]">Savings A/C</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div className="card p-5 border-l-4 border-l-blue-500">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                                        <LineChart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Savings Rate Insight</h4>
                                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                            Your savings rate is currently <strong className="text-[var(--color-text-primary)]">{userData.savingsRatePercentage}%</strong>. Increasing this to <strong className="text-emerald-400">35%</strong> dynamically accelerates your Goal timelines by an estimated 14 months.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="card p-5 border-l-4 border-l-purple-500">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                                        <Coins className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-1">Smart Cut Detection</h4>
                                        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                            Our AI detected a <strong className="text-red-400">+12%</strong> MoM jump in <em>Food & Dining</em> discretionary spending. Reallocating ?4,500 of this to your Growth Bucket optimizes your Wealth persona.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </main>
        </div>
    );
}
