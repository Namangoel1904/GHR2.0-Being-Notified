"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
    PiggyBank,
    Shield,
    Lightbulb,
    Scissors,
    TrendingUp,
    Flame,
    IndianRupee,
    ArrowRight,
    CheckCircle2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const savingsData = {
    monthlyIncome: 85000,
    monthlySavings: 17000,
    savingsRate: 20,
    emergencyFund: 210000,
    monthlyExpenses: 44000,
    monthsOfSafety: 4.8,
    needs: 42500, // 50%
    wants: 25500, // 30%
    savings: 17000, // 20%
};

const consistencyStreak = [
    { month: "Sep", saved: true },
    { month: "Oct", saved: true },
    { month: "Nov", saved: false },
    { month: "Dec", saved: true },
    { month: "Jan", saved: true },
    { month: "Feb", saved: true },
];

const recommendations = [
    {
        title: "Increase SIP by ₹2,000",
        description: "Your current savings rate aligns with 50-30-20. Bumping your SIP by ₹2K/month compounds to ₹4.8L in 10 years.",
        priority: "medium",
        impact: "+₹4.8L in 10yr",
    },
    {
        title: "Move ₹50K to Liquid Fund",
        description: "Your savings account earns 3.5%. A liquid mutual fund earns ~6.5% — same liquidity, higher returns.",
        priority: "high",
        impact: "+₹1,500/yr",
    },
    {
        title: "Top Up Emergency Fund",
        description: "You're at 4.8 months — great! Reach 6 months (₹2.64L) for complete financial safety net coverage.",
        priority: "medium",
        impact: "₹54K more",
    },
];

const cutSuggestions = [
    { category: "Subscriptions", current: 4993, suggested: 2844, saving: 2149, tip: "Cancel ChatGPT Plus & downgrade to free tier" },
    { category: "Dining Out", current: 8400, suggested: 5000, saving: 3400, tip: "Cook 3 more meals/week — save ₹3.4K/mo" },
    { category: "Shopping", current: 8900, suggested: 5000, saving: 3900, tip: "Apply 48-hr purchase rule for non-essentials" },
];

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ─── 50-30-20 Gauge Component ───────────────────────────────────────────────

function BudgetGauge({ needs, wants, savings, income }: { needs: number; wants: number; savings: number; income: number }) {
    const needsPct = (needs / income) * 100;
    const wantsPct = (wants / income) * 100;
    const savingsPct = (savings / income) * 100;

    return (
        <div className="space-y-4">
            {[
                { label: "Needs (50%)", actual: needsPct, target: 50, amount: needs, color: "#3b82f6" },
                { label: "Wants (30%)", actual: wantsPct, target: 30, amount: wants, color: "#a855f7" },
                { label: "Savings (20%)", actual: savingsPct, target: 20, amount: savings, color: "#06b6d4" },
            ].map((item) => (
                <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-[var(--color-text-muted)]">{item.label}</span>
                        <span className="text-[var(--color-text-primary)] font-medium">
                            {item.actual.toFixed(0)}% · ₹{item.amount.toLocaleString("en-IN")}
                        </span>
                    </div>
                    <div className="h-3 rounded-full bg-[var(--color-bg-primary)] overflow-hidden relative">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(item.actual, 100)}%` }}
                            transition={{ duration: 0.8 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        {/* Target marker */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                            style={{ left: `${item.target}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-[var(--color-text-dim)]">
                        <span>{item.actual <= item.target ? "✓ On track" : "⚠ Over budget"}</span>
                        <span>Target: {item.target}%</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SavingsPage() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                        AI <span className="text-gradient">Savings</span> Optimizer
                    </h1>
                    <p className="text-[var(--color-text-muted)] mt-1 text-sm">
                        Smart recommendations to maximize your wealth building
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                    className="space-y-6"
                >
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <motion.div variants={itemVariants} className="card p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                    <PiggyBank className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-text-muted)]">Monthly Savings</p>
                                    <p className="text-xl font-bold text-blue-400">₹{savingsData.monthlySavings.toLocaleString("en-IN")}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="card p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-text-muted)]">Savings Rate</p>
                                    <p className="text-xl font-bold text-blue-400">{savingsData.savingsRate}%</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="card p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-text-muted)]">Emergency Fund</p>
                                    <p className="text-xl font-bold text-yellow-400">₹{savingsData.emergencyFund.toLocaleString("en-IN")}</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="card p-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                                    <Flame className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-[var(--color-text-muted)]">Months of Safety</p>
                                    <p className="text-xl font-bold text-purple-400">{savingsData.monthsOfSafety}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* 50-30-20 + Consistency */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-5">
                                50-30-20 Budget Analysis
                            </h2>
                            <BudgetGauge
                                needs={savingsData.needs}
                                wants={savingsData.wants}
                                savings={savingsData.savings}
                                income={savingsData.monthlyIncome}
                            />
                        </motion.div>

                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-5">
                                Savings Consistency
                            </h2>
                            <div className="flex items-center gap-3 mb-4">
                                {consistencyStreak.map((m) => (
                                    <div key={m.month} className="flex-1 text-center">
                                        <div className={cn(
                                            "w-full aspect-square rounded-xl flex items-center justify-center mb-1.5 text-lg font-bold",
                                            m.saved ? "bg-blue-500/15 text-blue-400" : "bg-red-500/10 text-red-400"
                                        )}>
                                            {m.saved ? "✓" : "✗"}
                                        </div>
                                        <span className="text-xs text-[var(--color-text-dim)]">{m.month}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                <div className="flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm font-semibold text-blue-300">3 Month Streak!</span>
                                </div>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                                    You&apos;ve saved consistently for 3 consecutive months. Keep it up!
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* AI Recommendations */}
                    <motion.div variants={itemVariants} className="card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Lightbulb className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                AI Savings Recommendations
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {recommendations.map((rec, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "p-5 rounded-xl border transition-all hover:scale-[1.01]",
                                        rec.priority === "high"
                                            ? "border-blue-500/30 bg-blue-500/5"
                                            : "border-[var(--color-border)] bg-[var(--color-bg-primary)]/40"
                                    )}
                                >
                                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                                        {rec.title}
                                    </h3>
                                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">
                                        {rec.description}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-blue-400 font-medium">{rec.impact}</span>
                                        <ArrowRight className="w-4 h-4 text-[var(--color-text-dim)]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Smart Cut Suggestions */}
                    <motion.div variants={itemVariants} className="card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Scissors className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                Smart Cut Suggestions
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {cutSuggestions.map((cut) => (
                                <div
                                    key={cut.category}
                                    className="p-4 rounded-xl border border-[var(--color-border)] hover:border-blue-500/20 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{cut.category}</span>
                                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 font-medium">
                                            Save ₹{cut.saving.toLocaleString("en-IN")}/mo
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs mb-2">
                                        <span className="text-red-400">₹{cut.current.toLocaleString("en-IN")}</span>
                                        <ArrowRight className="w-3 h-3 text-[var(--color-text-dim)]" />
                                        <span className="text-blue-400">₹{cut.suggested.toLocaleString("en-IN")}</span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-dim)]">💡 {cut.tip}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                            <p className="text-sm text-blue-300 font-semibold">
                                Potential Monthly Savings: ₹{cutSuggestions.reduce((s, c) => s + c.saving, 0).toLocaleString("en-IN")}
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
}
