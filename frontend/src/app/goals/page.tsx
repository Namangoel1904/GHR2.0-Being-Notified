"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useSWR from "swr";
import {
    Target,
    Plus,
    Car,
    Home,
    Briefcase,
    Shield,
    GraduationCap,
    Sparkles,
    IndianRupee,
    ChevronRight,
    X,
    TrendingUp,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";
import { fetcher } from "@/hooks/useFinancialData";

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

// ─── Animations ─────────────────────────────────────────────────────────────

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

    // Dynamically recalculate ETA based on actual remaining balance divided by their original monthly target obligation
    const monthsNeeded = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : 0;

    // --- Local Fund State for Card --- //
    const [fundInput, setFundInput] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAddFund = async () => {
        const amount = Number(fundInput);
        if (!amount || amount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsAdding(true);
        try {
            const userId = localStorage.getItem("user_id") || "";
            const res = await fetch(`http://localhost:8080/api/dashboard/goals/${goal.id}/fund`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Successfully added ₹${amount.toLocaleString("en-IN")} to ${goal.name}!`);
                setFundInput("");
                // We emit an event or rely on parent mutate
                window.dispatchEvent(new Event('goal_updated'));
            } else {
                toast.error(data.error || "Failed to add funds");
            }
        } catch (error) {
            toast.error("Network error");
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="card p-6 border-[var(--color-border)] hover:border-blue-500/20 transition-all flex flex-col"
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
            <div className="grid grid-cols-3 gap-3 text-center mb-5 flex-grow">
                <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/40 flex flex-col justify-center">
                    <p className="text-xs text-[var(--color-text-dim)]">Monthly Avg</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        ₹{goal.monthlyContribution.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/40 flex flex-col justify-center">
                    <p className="text-xs text-[var(--color-text-dim)]">Remaining</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        ₹{remaining.toLocaleString("en-IN")}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-primary)]/40 flex flex-col justify-center">
                    <p className="text-xs text-[var(--color-text-dim)]">ETA</p>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                        {monthsNeeded}mo
                    </p>
                </div>
            </div>

            {/* Fund Input Area */}
            {progress < 100 ? (
                <div className="mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                    <div className="relative flex-grow">
                        <IndianRupee className="w-4 h-4 text-[var(--color-text-dim)] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="number"
                            placeholder="Add savings..."
                            value={fundInput}
                            onChange={(e) => setFundInput(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                    <button
                        onClick={handleAddFund}
                        disabled={isAdding || !fundInput}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors flex shrink-0 items-center justify-center min-w-[80px]"
                    >
                        {isAdding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Fund It"}
                    </button>
                </div>
            ) : (
                <div className="mt-auto pt-4 border-t border-[var(--color-border)] text-center">
                    <p className="text-sm text-green-400 font-medium flex items-center justify-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Goal Fully Funded!
                    </p>
                </div>
            )}
        </motion.div>
    );
}

// ─── Create Goal Modal ──────────────────────────────────────────────────────

function CreateGoalModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [goalType, setGoalType] = useState<GoalType | null>(null);
    const [name, setName] = useState("");
    const [targetAmount, setTargetAmount] = useState("");
    const [timeframe, setTimeframe] = useState("1 year");
    const [monthlyContribution, setMonthlyContribution] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSubmit = async () => {
        if (!name || !targetAmount || !goalType) {
            toast.error("Please fill in Goal Name, Target Amount, and select a Goal Type");
            return;
        }

        setIsAnalyzing(true);
        // Simulate AI Analysis
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const years = parseInt(timeframe.split(" ")[0]) || 1;
            const deadline = new Date();
            deadline.setFullYear(deadline.getFullYear() + years);

            const payload = {
                title: name,
                target_amount: Number(targetAmount),
                current_amount: 0,
                deadline: deadline.toISOString().split("T")[0],
                category: goalType
            };

            const userId = localStorage.getItem("user_id") || "";
            const response = await fetch("http://localhost:8080/api/dashboard/goals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-id": userId
                },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (result.success) {
                toast.success("AI Analysis Complete: Goal Added & Optimized!");
                onSuccess();
            } else {
                toast.error(result.error || "Failed to add goal");
            }
        } catch (error) {
            toast.error("Failed to connect to server");
        } finally {
            setIsAnalyzing(false);
        }
    };

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
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Dream Home Down Payment"
                            className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Target Amount (₹)</label>
                            <input
                                type="number"
                                value={targetAmount}
                                onChange={(e) => setTargetAmount(e.target.value)}
                                placeholder="500000"
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-[var(--color-text-muted)] mb-1.5 block">Timeframe</label>
                            <select
                                value={timeframe}
                                onChange={(e) => setTimeframe(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-blue-500/40"
                            >
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
                                value={monthlyContribution}
                                onChange={(e) => setMonthlyContribution(e.target.value)}
                                placeholder="10000"
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

                <button
                    onClick={handleSubmit}
                    disabled={isAnalyzing}
                    className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            AI Analyzing Feasibility...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" /> Create Goal & Get AI Analysis
                        </>
                    )}
                </button>
            </motion.div>
        </motion.div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function GoalsPage() {
    const { data: dbData, mutate } = useSWR<{ success: boolean; goals: any[] }>('http://localhost:8080/api/dashboard/goals', fetcher);
    const [showCreate, setShowCreate] = useState(false);

    // AI Smart Allocation States
    const [totalSavingsPool, setTotalSavingsPool] = useState(0);
    const [allocatedGoals, setAllocatedGoals] = useState<Goal[]>([]);

    // Map backend goals to UI interface & Auto-Allocate
    useEffect(() => {
        // 1. Listen for cross-component funding events
        const handleUpdate = () => mutate();
        window.addEventListener('goal_updated', handleUpdate);
        return () => window.removeEventListener('goal_updated', handleUpdate);
    }, [mutate]);

    // 2. Map backend goals to UI interface (Manual Logic)
    const goalsList = useMemo<Goal[]>(() => {
        if (dbData?.success && dbData.goals && dbData.goals.length > 0) {
            const validTypes = ["car", "house", "business", "emergency", "education"];
            return dbData.goals.map((bg: any) => {
                const targetAmount = bg.target_amount || 1;
                const currentAmount = bg.current_amount || 0;
                const remaining = Math.max(0, targetAmount - currentAmount);

                // Deadlines & required contribution calculation (based on original target)
                const d = new Date(bg.deadline || new Date());
                const months = Math.max(1, (d.getFullYear() - new Date().getFullYear()) * 12 + d.getMonth() - new Date().getMonth());
                const reqMonthly = Math.ceil(targetAmount / months);

                const t = bg.category?.toLowerCase() || "";
                const mappedType = validTypes.includes(t) ? t as GoalType : "emergency";

                const priority = ["emergency", "education"].includes(mappedType) ? "high" : mappedType === "house" ? "medium" : "low";

                // Feasibility score
                const ratio = currentAmount / targetAmount;
                const feasibilityScore = Math.min(98, Math.floor(70 + ratio * 30));

                return {
                    id: bg.id,
                    type: mappedType,
                    name: bg.title,
                    targetAmount,
                    currentAmount,
                    monthlyContribution: reqMonthly,
                    timelineMonths: months,
                    priority,
                    feasibilityScore,
                    requiredMonthly: reqMonthly
                };
            });
        }
        return [];
    }, [dbData]);

    const totalTarget = goalsList.reduce((s: number, g: Goal) => s + g.targetAmount, 0);
    const totalSaved = goalsList.reduce((s: number, g: Goal) => s + g.currentAmount, 0);
    const totalMonthly = goalsList.reduce((s: number, g: Goal) => s + g.monthlyContribution, 0);

    return (
        <div className="min-h-screen">
            <Toaster position="top-right" />
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
                        {goalsList.map((goal: Goal) => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                </motion.div>

                {/* Create Modal */}
                <AnimatePresence>
                    {showCreate && <CreateGoalModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); mutate(); }} />}
                </AnimatePresence>
            </main>
        </div>
    );
}
