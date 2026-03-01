"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    TrendingUp,
    Sliders,
    LineChart as LineChartIcon,
    AlertTriangle,
    Sparkles,
    Brain
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
    expenseRatio: number,
    savingsRate: number,
    goalContribution: number,
    unexpectedExpense: number,
    months: number,
    scenario: "current" | "optimized" | "risk"
) {
    const data = [];
    let savings = 120000; // Starting baseline savings (mock corpus)

    // Base calculations
    let currentExpenseRatio = expenseRatio;
    let currentSavingsRate = savingsRate;

    // AI Optimization Logic: Reduce expenses by 15%, boost savings
    if (scenario === "optimized") {
        currentExpenseRatio = Math.max(40, expenseRatio - 15);
        currentSavingsRate = savingsRate + 15;
    }

    const monthlyExpenses = monthlyIncome * (currentExpenseRatio / 100);
    let monthlySavings = monthlyIncome * (currentSavingsRate / 100);

    // Ensure realistic bounds: Savings can't exceed what's left after expenses and goals
    const maxPossibleSavings = monthlyIncome - monthlyExpenses - goalContribution;
    monthlySavings = Math.min(monthlySavings, maxPossibleSavings);

    // Fallback if expenses + goals > income
    if (monthlySavings < 0) monthlySavings = 0;

    for (let m = 0; m <= months; m++) {
        let actualSavings = monthlySavings;

        // Risk Scenario: Sudden shock
        if (scenario === "risk" && m > 0) {
            // Add unexpected expense at roughly 1/3 and 2/3 of the simulation duration
            if (m === Math.floor(months / 3) || m === Math.floor((months / 3) * 2)) {
                actualSavings = monthlySavings - unexpectedExpense;
            }
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
    // User adjustable variables
    const [monthlyIncome, setMonthlyIncome] = useState(85000);
    const [expenseRatio, setExpenseRatio] = useState(65);
    const [savingsRate, setSavingsRate] = useState(15);
    const [goalContribution, setGoalContribution] = useState(5000);
    const [unexpectedExpense, setUnexpectedExpense] = useState(40000);
    const [duration, setDuration] = useState<6 | 12 | 24>(12);

    const projections = useMemo(() => {
        const current = generateProjection(monthlyIncome, expenseRatio, savingsRate, goalContribution, unexpectedExpense, duration, "current");
        const optimized = generateProjection(monthlyIncome, expenseRatio, savingsRate, goalContribution, unexpectedExpense, duration, "optimized");
        const risk = generateProjection(monthlyIncome, expenseRatio, savingsRate, goalContribution, unexpectedExpense, duration, "risk");

        return current.map((c, i) => ({
            month: c.month,
            current: c.current,
            optimized: optimized[i].optimized,
            risk: risk[i].risk,
        }));
    }, [monthlyIncome, expenseRatio, savingsRate, goalContribution, unexpectedExpense, duration]);

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
            desc: "Reducing discretionary spend by 15% and boosting savings.",
        },
        {
            label: "Risk Scenario",
            amount: riskFinal,
            color: "#f97316",
            icon: AlertTriangle,
            desc: `Impact of sudden ₹${unexpectedExpense.toLocaleString("en-IN")} unexpected expenses.`,
        },
    ];

    return (
        <div className="min-h-screen pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
                        Financial <span className="text-gradient hover-glow">Future</span> Simulator
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm max-w-2xl">
                        Project your wealth trajectory interactively. Adjust your lifestyle parameters to see the long-term impact of your financial decisions and potential risks.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                    className="space-y-6"
                >
                    {/* Top Section: Duration Toggle */}
                    <motion.div variants={itemVariants} className="flex items-center gap-3 bg-[var(--color-bg-elevated)] p-2 rounded-xl border border-[var(--color-border)] w-fit">
                        <span className="text-sm text-[var(--color-text-muted)] font-medium pl-2">Projection Horizon:</span>
                        {([6, 12, 24] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={cn(
                                    "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                                    duration === d
                                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]"
                                )}
                            >
                                {d} Months
                            </button>
                        ))}
                    </motion.div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                        {/* Interactive Controls (Left Panel) */}
                        <motion.div variants={itemVariants} className="xl:col-span-1 space-y-4">
                            <div className="card p-5 h-full border-t-4 border-t-purple-500">
                                <div className="flex items-center gap-2 mb-6">
                                    <Sliders className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Behavior Variables</h2>
                                </div>

                                <div className="space-y-6">
                                    {/* Income */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-[var(--color-text-muted)] font-medium">Monthly Income</span>
                                            <span className="text-emerald-400 font-bold">₹{monthlyIncome.toLocaleString("en-IN")}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={20000}
                                            max={500000}
                                            step={5000}
                                            value={monthlyIncome}
                                            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-emerald-500"
                                        />
                                    </div>

                                    {/* Expense Ratio */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-[var(--color-text-muted)] font-medium">Monthly Expenses</span>
                                            <span className="text-red-400 font-bold">{expenseRatio}% of Inc</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={30}
                                            max={100}
                                            step={1}
                                            value={expenseRatio}
                                            onChange={(e) => setExpenseRatio(Number(e.target.value))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-red-500"
                                        />
                                        <p className="text-[10px] text-[var(--color-text-dim)] mt-1 font-mono">
                                            ₹{(monthlyIncome * (expenseRatio / 100)).toLocaleString("en-IN")} / month
                                        </p>
                                    </div>

                                    {/* Savings Rate */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-[var(--color-text-muted)] font-medium">Savings Rate</span>
                                            <span className="text-blue-400 font-bold">{savingsRate}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={Math.max(0, 100 - expenseRatio)} // Limit slider
                                            step={1}
                                            value={savingsRate}
                                            onChange={(e) => setSavingsRate(Number(e.target.value))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-blue-500"
                                        />
                                        <p className="text-[10px] text-[var(--color-text-dim)] mt-1 font-mono">
                                            ₹{(monthlyIncome * (savingsRate / 100)).toLocaleString("en-IN")} / month
                                        </p>
                                    </div>

                                    <hr className="border-[var(--color-border)] opacity-50" />

                                    {/* Goal Contribution */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-[var(--color-text-muted)] font-medium">Goal Allocation</span>
                                            <span className="text-purple-400 font-bold">₹{goalContribution.toLocaleString("en-IN")}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={50000}
                                            step={1000}
                                            value={goalContribution}
                                            onChange={(e) => setGoalContribution(Number(e.target.value))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-purple-500"
                                        />
                                        <p className="text-[10px] text-[var(--color-text-dim)] mt-1 font-mono">
                                            Deducted before savings build
                                        </p>
                                    </div>

                                    {/* Unexpected Expense Shock */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-[var(--color-text-muted)] font-medium">Shock Expense</span>
                                            <span className="text-orange-400 font-bold">₹{unexpectedExpense.toLocaleString("en-IN")}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={200000}
                                            step={5000}
                                            value={unexpectedExpense}
                                            onChange={(e) => setUnexpectedExpense(Number(e.target.value))}
                                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-orange-500"
                                        />
                                        <p className="text-[10px] text-orange-400/70 mt-1 leading-tight border-l-2 border-orange-500 pl-2">
                                            Simulates a sudden emergency cost hitting your savings in month {Math.floor(duration / 3)} & {Math.floor((duration / 3) * 2)}.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Projection Chart (Right Panel) */}
                        <motion.div variants={itemVariants} className="xl:col-span-3 card p-6 flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <LineChartIcon className="w-6 h-6 text-blue-400" />
                                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                                    Corpus Growth Multi-Horizon Projection
                                </h2>
                            </div>

                            <div className="flex-1 min-h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={projections} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="month"
                                            stroke="var(--color-text-muted)"
                                            tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="var(--color-text-muted)"
                                            tick={{ fill: 'var(--color-text-dim)', fontSize: 12 }}
                                            tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                                            axisLine={false}
                                            tickLine={false}
                                            width={65}
                                            dx={-10}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: "var(--color-bg-elevated)",
                                                border: "1px solid var(--color-border)",
                                                borderRadius: "12px",
                                                color: "var(--color-text-primary)",
                                                fontSize: "13px",
                                                boxShadow: "0 10px 20px -5px rgba(0, 0, 0, 0.5)"
                                            }}
                                            itemStyle={{ fontWeight: "bold", padding: "2px 0" }}
                                            formatter={(val: number | undefined) => `₹${(val ?? 0).toLocaleString("en-IN")}`}
                                            labelStyle={{ color: "var(--color-text-muted)", marginBottom: "8px", fontWeight: "bold" }}
                                        />
                                        <Legend
                                            wrapperStyle={{ paddingTop: "20px" }}
                                            iconType="circle"
                                        />

                                        <defs>
                                            <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>

                                        <Area
                                            type="monotone"
                                            dataKey="optimized"
                                            name="AI Optimized Path"
                                            stroke="#06b6d4"
                                            fill="url(#colorOptimized)"
                                            strokeWidth={3}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="current"
                                            name="Current Financial Path"
                                            stroke="#3b82f6"
                                            fill="url(#colorCurrent)"
                                            strokeWidth={3}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="risk"
                                            name="Risk Shock Scenario"
                                            stroke="#f97316"
                                            fill="transparent"
                                            strokeWidth={2}
                                            strokeDasharray="6 6"
                                            activeDot={{ r: 5, fill: "#f97316", strokeWidth: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                    </div>

                    {/* AI Explanation Engine Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {scenarios.map((sc, idx) => {
                            const Icon = sc.icon;
                            let explanation = "";

                            // ─── Explainable AI Engine ───
                            if (idx === 0) {
                                explanation = expenseRatio > 70
                                    ? `Based on your high ${expenseRatio}% spending ratio, your savings growth remains slow and vulnerable to inflation. Your net growth slows heavily.`
                                    : `Maintaining a ${expenseRatio}% spend ratio keeps your wealth growing steadily, resulting in a ₹${(currentFinal / 100000).toFixed(1)}L corpus.`;
                            } else if (idx === 1) {
                                explanation = `By successfully reducing discretionary expenses by 15% and increasing savings to ${savingsRate + 15}%, your financial stability improves massively, yielding an extra ₹${(optimizedFinal - currentFinal).toLocaleString("en-IN")} over ${duration} months.`;
                            } else {
                                explanation = `An unexpected expense of ₹${unexpectedExpense.toLocaleString("en-IN")} repeated twice in this period depletes your projected corpus by ₹${(currentFinal - riskFinal).toLocaleString("en-IN")}. You must build an emergency fund to absorb this.`;
                            }

                            return (
                                <motion.div
                                    key={sc.label}
                                    variants={itemVariants}
                                    className="card p-6 flex flex-col justify-between border-t-4"
                                    style={{ borderTopColor: sc.color }}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${sc.color}15` }}>
                                                    <Icon className="w-5 h-5" style={{ color: sc.color }} />
                                                </div>
                                                <span className="text-sm font-bold text-[var(--color-text-primary)]">{sc.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Brain className="w-4 h-4 text-blue-400" />
                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">AI Explanation</p>
                                        </div>
                                        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed italic border-l-2 border-[var(--color-border)] pl-3">
                                            &quot;{explanation}&quot;
                                        </p>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-dim)] mb-1">Projected Corpus ({duration}m):</p>
                                        <p className="text-3xl font-black" style={{ color: sc.color }}>
                                            ₹{(sc.amount / 100000).toFixed(2)}L
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
