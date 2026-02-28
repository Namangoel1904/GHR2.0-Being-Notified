"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Plus,
    Car,
    Home,
    Briefcase,
    Shield,
    GraduationCap,
    Sparkles,
    TrendingUp,
    AlertTriangle,
    Calendar,
    IndianRupee,
    ChevronRight,
    X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type GoalType = "car" | "house" | "business" | "emergency" | "education";

interface Goal {
    id: string;
    type: GoalType;
    name: string;
    targetAmount: number;
    currentAmount: number;
    monthlyContribution: number;
    timelineMonths: number;
    priority: "high" | "medium" | "low";
    feasibilityScore: number;
    requiredMonthly: number;
}

const goalIcons: Record<GoalType, typeof Car> = {
    car: Car,
    house: Home,
    business: Briefcase,
    emergency: Shield,
    education: GraduationCap,
};

const goalColors: Record<GoalType, string> = {
    car: "#3b82f6",
    house: "#a855f7",
    business: "#f97316",
    emergency: "#06b6d4",
    education: "#ec4899",
};

// ─── Mock Goals ─────────────────────────────────────────────────────────────

const initialGoals: Goal[] = [
    {
        id: "1",
        type: "emergency",
        name: "Emergency Fund",
        targetAmount: 300000,
        currentAmount: 210000,
        monthlyContribution: 8000,
        timelineMonths: 12,
        priority: "high",
        feasibilityScore: 92,
        requiredMonthly: 7500,
    },
    {
        id: "2",
        type: "car",
        name: "Car Down Payment",
        targetAmount: 500000,
        currentAmount: 85000,
        monthlyContribution: 12000,
        timelineMonths: 36,
        priority: "medium",
        feasibilityScore: 78,
        requiredMonthly: 11528,
    },
    {
        id: "3",
        type: "education",
        name: "MS Course Fund",
        targetAmount: 1500000,
        currentAmount: 200000,
        monthlyContribution: 15000,
        timelineMonths: 60,
        priority: "medium",
        feasibilityScore: 65,
        requiredMonthly: 21667,
    },
];

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ─── Goal Card ──────────────────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
    const Icon = goalIcons[goal.type];
    const color = goalColors[goal.type];
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);

    return (
        <motion.div
            variants={itemVariants}
            className="card p-6 hover:border-blue-500/20 transition-all"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--color-text-primary)]">{goal.name}</h3>
                        <p className="text-xs text-[var(--color-text-dim)] capitalize">{goal.type} · {goal.priority} priority</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-medium",
                        goal.feasibilityScore >= 80
                            ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            : goal.feasibilityScore >= 60
                                ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20"
                                : "bg-red-500/10 text-red-300 border border-red-500/20"
                    )}>
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        {goal.feasibilityScore}% feasible
                    </div>
                </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-[var(--color-text-muted)]">
                        ₹{goal.currentAmount.toLocaleString("en-IN")} saved
                    </span>
                    <span className="text-[var(--color-text-primary)] font-medium">
                        ₹{goal.targetAmount.toLocaleString("en-IN")}
                    </span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                    />
                </div>
                <p className="text-xs text-[var(--color-text-dim)] mt-1">{progress.toFixed(1)}% complete</p>
            </div>

            {/* Details */}
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/40">
                    <p className="text-xs text-[var(--color-text-dim)]">Monthly</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        ₹{goal.monthlyContribution.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/40">
                    <p className="text-xs text-[var(--color-text-dim)]">Remaining</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        ₹{remaining.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/40">
                    <p className="text-xs text-[var(--color-text-dim)]">ETA</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {monthsNeeded}mo
                    </p>
                </div>
            </div>

            {/* AI Suggestion */}
            {goal.monthlyContribution < goal.requiredMonthly && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <p className="text-xs text-yellow-300">
                            Need ₹{goal.requiredMonthly.toLocaleString("en-IN")}/mo to hit target on time. Increase by ₹{(goal.requiredMonthly - goal.monthlyContribution).toLocaleString("en-IN")}/mo.
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

// ─── Create Goal Modal ──────────────────────────────────────────────────────

function CreateGoalModal({ onClose }: { onClose: () => void }) {
    const [goalType, setGoalType] = useState<GoalType | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="card p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Create New Goal</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-all">
                        <X className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </button>
                </div>

                {/* Goal Type Selector */}
                <div className="mb-6">
                    <label className="text-sm text-[var(--color-text-muted)] mb-3 block">Goal Type</label>
                    <div className="grid grid-cols-5 gap-2">
                        {(Object.entries(goalIcons) as [GoalType, typeof Car][]).map(([type, Icon]) => (
                            <button
                                key={type}
                                onClick={() => setGoalType(type)}
                                className={cn(
                                    "p-3 rounded-xl border text-center transition-all",
                                    goalType === type
                                        ? "border-blue-500/40 bg-blue-500/10"
                                        : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                                )}
                            >
                                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: goalColors[type] }} />
                                <span className="text-[10px] text-[var(--color-text-dim)] capitalize">{type}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Goal Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Dream Home Down Payment"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Target Amount (₹)</label>
                            <input
                                type="number"
                                placeholder="5,00,000"
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Timeframe</label>
                            <select className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40">
                                <option>6 months</option>
                                <option>1 year</option>
                                <option>2 years</option>
                                <option>3 years</option>
                                <option>5 years</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Monthly Contribution (₹)</label>
                            <input
                                type="number"
                                placeholder="10,000"
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Priority</label>
                            <select className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40">
                                <option>High</option>
                                <option>Medium</option>
                                <option>Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                <button className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Create Goal & Get AI Analysis
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GoalsPage() {
    const [goals] = useState<Goal[]>(initialGoals);
    const [showCreate, setShowCreate] = useState(false);

    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
    const totalMonthly = goals.reduce((s, g) => s + g.monthlyContribution, 0);

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                            Goal-Based <span className="text-gradient">Planning</span>
                        </h1>
                        <p className="text-[var(--color-text-muted)] mt-1 text-sm">
                            AI-powered feasibility analysis for your financial dreams
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-4 h-4" /> New Goal
                    </button>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                    className="space-y-6"
                >
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.div variants={itemVariants} className="card p-5">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Target</p>
                            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                ₹{totalTarget.toLocaleString("en-IN")}
                            </p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="card p-5">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Total Saved</p>
                            <p className="text-2xl font-bold text-blue-400">
                                ₹{totalSaved.toLocaleString("en-IN")}
                            </p>
                            <div className="h-1.5 rounded-full bg-[var(--color-bg-primary)] mt-2 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-blue-500"
                                    style={{ width: `${(totalSaved / totalTarget) * 100}%` }}
                                />
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="card p-5">
                            <p className="text-xs text-[var(--color-text-muted)] mb-1">Monthly Commitment</p>
                            <p className="text-2xl font-bold text-blue-400">
                                ₹{totalMonthly.toLocaleString("en-IN")}
                            </p>
                        </motion.div>
                    </div>

                    {/* Goal Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {goals.map((goal) => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                </motion.div>

                {/* Create Modal */}
                <AnimatePresence>
                    {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} />}
                </AnimatePresence>
            </main>
        </div>
    );
}
