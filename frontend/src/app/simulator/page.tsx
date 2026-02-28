"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp,
    Sliders,
    LineChart,
    Shield,
    AlertTriangle,
    Sparkles,
    Brain,
    IndianRupee,
    ArrowRight,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// ─── Simulation Logic ───────────────────────────────────────────────────────

function generateProjection(
    monthlyIncome: number,
    monthlyExpenses: number,
    savingsRate: number,
    months: number,
    scenario: "current" | "optimized" | "risk"
) {
    const data = [];
    let savings = 210000; // Starting savings (from mock)
    const monthlySavings = monthlyIncome * (savingsRate / 100);

    for (let m = 0; m <= months; m++) {
        let actualSavings = monthlySavings;

        if (scenario === "optimized") {
            actualSavings = monthlySavings * 1.35; // 35% more through AI cuts
        } else if (scenario === "risk") {
            // Random unexpected expenses every few months
            if (m % 4 === 3) actualSavings = monthlySavings - 15000;
            if (m === 8) actualSavings = monthlySavings - 50000; // Major expense
        }

        savings = Math.max(0, savings + actualSavings);

        data.push({
            month: `M${m}`,
            current: scenario === "current" ? Math.round(savings) : undefined,
            optimized: scenario === "optimized" ? Math.round(savings) : undefined,
            risk: scenario === "risk" ? Math.round(savings) : undefined,
        });
    }
    return data;
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SimulatorPage() {
    const [income, setIncome] = useState(85000);
    const [expenses, setExpenses] = useState(44000);
    const [savingsRate, setSavingsRate] = useState(20);
    const [duration, setDuration] = useState<6 | 12 | 24>(12);

    const projections = useMemo(() => {
        const current = generateProjection(income, expenses, savingsRate, duration, "current");
        const optimized = generateProjection(income, expenses, savingsRate, duration, "optimized");
        const risk = generateProjection(income, expenses, savingsRate, duration, "risk");

        return current.map((c, i) => ({
            month: c.month,
            current: c.current,
            optimized: optimized[i].optimized,
            risk: risk[i].risk,
        }));
    }, [income, expenses, savingsRate, duration]);

    const currentFinal = projections[projections.length - 1]?.current ?? 0;
    const optimizedFinal = projections[projections.length - 1]?.optimized ?? 0;
    const riskFinal = projections[projections.length - 1]?.risk ?? 0;

    const scenarios = [
        {
            label: "Current Path",
            amount: currentFinal,
            color: "#3b82f6",
            icon: TrendingUp,
            desc: "If you maintain your current spending and savings habits.",
        },
        {
            label: "AI Optimized",
            amount: optimizedFinal,
            color: "#06b6d4",
            icon: Sparkles,
            desc: "Following ArthNiti's smart cut suggestions & rebalancing.",
        },
        {
            label: "Risk Scenario",
            amount: riskFinal,
            color: "#f97316",
            icon: AlertTriangle,
            desc: "Unexpected expenses (medical, repair) every few months.",
        },
    ];

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
                        Financial <span className="text-gradient">Future</span> Simulator
                    </h1>
                    <p className="text-[var(--color-text-muted)] mt-1 text-sm">
                        What-if scenario simulation with AI projections
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                    className="space-y-6"
                >
                    {/* Interactive Controls */}
                    <motion.div variants={itemVariants} className="card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Sliders className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Adjust Parameters</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--color-text-muted)]">Monthly Income</span>
                                    <span className="text-blue-400 font-medium">₹{income.toLocaleString("en-IN")}</span>
                                </div>
                                <input
                                    type="range"
                                    min={20000}
                                    max={300000}
                                    step={5000}
                                    value={income}
                                    onChange={(e) => setIncome(Number(e.target.value))}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-[var(--color-text-dim)] mt-1">
                                    <span>₹20K</span>
                                    <span>₹3L</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--color-text-muted)]">Monthly Expenses</span>
                                    <span className="text-red-400 font-medium">₹{expenses.toLocaleString("en-IN")}</span>
                                </div>
                                <input
                                    type="range"
                                    min={10000}
                                    max={200000}
                                    step={2000}
                                    value={expenses}
                                    onChange={(e) => setExpenses(Number(e.target.value))}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-red-500"
                                />
                                <div className="flex justify-between text-xs text-[var(--color-text-dim)] mt-1">
                                    <span>₹10K</span>
                                    <span>₹2L</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-[var(--color-text-muted)]">Savings Rate</span>
                                    <span className="text-blue-400 font-medium">{savingsRate}%</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={50}
                                    step={5}
                                    value={savingsRate}
                                    onChange={(e) => setSavingsRate(Number(e.target.value))}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-blue-500"
                                />
                                <div className="flex justify-between text-xs text-[var(--color-text-dim)] mt-1">
                                    <span>0%</span>
                                    <span className="text-blue-400/60">≥20% recommended</span>
                                    <span>50%</span>
                                </div>
                            </div>
                        </div>

                        {/* Duration Tabs */}
                        <div className="flex items-center gap-2 mt-6">
                            <span className="text-sm text-[var(--color-text-muted)]">Projection:</span>
                            {([6, 12, 24] as const).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                                        duration === d
                                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                                            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                    )}
                                >
                                    {d}mo
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Projection Chart */}
                    <motion.div variants={itemVariants} className="card p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <LineChart className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                Wealth Projection ({duration} months)
                            </h2>
                        </div>
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={projections}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" tick={{ fontSize: 11 }} />
                                <YAxis
                                    stroke="rgba(0,0,0,0.3)"
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "#ffffff",
                                        border: "1px solid rgba(0,0,0,0.1)",
                                        borderRadius: "12px",
                                        color: "#0f172a",
                                        fontSize: "12px",
                                    }}
                                    formatter={(val: number | undefined) => `₹${(val ?? 0).toLocaleString("en-IN")}`}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="optimized"
                                    name="AI Optimized"
                                    stroke="#06b6d4"
                                    fill="#06b6d420"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="current"
                                    name="Current Path"
                                    stroke="#3b82f6"
                                    fill="#3b82f620"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="risk"
                                    name="Risk Scenario"
                                    stroke="#f97316"
                                    fill="#f9731620"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </motion.div>

                    {/* Scenario Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {scenarios.map((sc) => {
                            const Icon = sc.icon;
                            return (
                                <motion.div
                                    key={sc.label}
                                    variants={itemVariants}
                                    className="card p-5 hover:border-blue-500/20 transition-all"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${sc.color}20` }}>
                                            <Icon className="w-5 h-5" style={{ color: sc.color }} />
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{sc.label}</span>
                                    </div>
                                    <p className="text-2xl font-bold mb-2" style={{ color: sc.color }}>
                                        ₹{sc.amount.toLocaleString("en-IN")}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                        {sc.desc}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* AI Explanation */}
                    <motion.div variants={itemVariants} className="card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Brain className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">AI Analysis</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                                <p className="text-sm text-[var(--color-text-primary)]">
                                    <strong className="text-blue-400">Optimized path saves you ₹{(optimizedFinal - currentFinal).toLocaleString("en-IN")} more</strong> over {duration} months by following the smart cut suggestions from ArthNiti. This includes reducing dining out, optimizing subscriptions, and applying the 48-hour purchase rule.
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                                <p className="text-sm text-[var(--color-text-primary)]">
                                    <strong className="text-yellow-400">Risk scenario shows ₹{(currentFinal - riskFinal).toLocaleString("en-IN")} less</strong> due to unexpected expenses. Building a 6-month emergency fund would absorb these shocks without derailing your savings plan.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </main>
        </div>
    );
}
