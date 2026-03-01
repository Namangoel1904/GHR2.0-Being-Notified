"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Target,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Sparkles,
    Bell,
    Plus,
    Loader2,
    WifiOff,
    RefreshCw,
    Award,
    X,
    LineChart as LineChartIcon
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { cn, formatCurrency } from "@/lib/utils";
import { useOnboardingProfile } from "@/hooks/useFinancialData";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCurrentMonthYear() {
    const d = new Date();
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HealthScoreGauge({ score, trend }: { score: number; trend: string }) {
    const circumference = 2 * Math.PI * 60;
    const progress = (score / 100) * circumference;
    const color = score >= 75 ? "#22d3ee" : score >= 50 ? "#fbbf24" : "#f87171";

    return (
        <div className="relative w-40 h-40 mx-auto">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-border)" strokeWidth="8" />
                <motion.circle
                    cx="70" cy="70" r="60" fill="none" stroke={color} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl font-bold" style={{ color }}
                >{score}</motion.span>
                <span className="text-xs text-[var(--color-text-muted)]">Health Score</span>
            </div>
        </div>
    );
}

function StatCard({
    label, value, change, icon: Icon, positive, isLoading,
}: {
    label: string; value: string; change: string;
    icon: React.ComponentType<{ className?: string }>; positive: boolean; isLoading?: boolean;
}) {
    return (
        <motion.div whileHover={{ y: -2 }} className="card p-5">
            <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
                    positive ? "text-blue-400 bg-blue-500/10" : "text-red-400 bg-red-500/10"
                )}>
                    {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {change}
                </div>
            </div>
            {isLoading ? (
                <div className="h-8 w-24 rounded-lg bg-[var(--color-bg-elevated)] animate-pulse" />
            ) : (
                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
            )}
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{label}</p>
        </motion.div>
    );
}

const severityStyles = {
    low: "border-blue-500/20 bg-blue-500/5 text-blue-300",
    medium: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
    high: "border-red-500/20 bg-red-500/5 text-red-300",
};

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload) return null;
    return (
        <div className="glass-strong rounded-xl p-3 text-sm border border-[var(--color-glass-border)]">
            <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
            {payload.map((entry: any, i: number) => (
                <p key={i} style={{ color: entry.color }} className="font-medium">
                    {entry.name}: {formatCurrency(entry.value)}
                </p>
            ))}
        </div>
    );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-red-300 text-sm">
                <WifiOff className="w-4 h-4" />
                {message}
            </div>
            <button onClick={onRetry} className="flex items-center gap-1 text-xs text-red-300 hover:text-red-200">
                <RefreshCw className="w-3 h-3" /> Retry
            </button>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="flex items-center justify-center py-20 text-[var(--color-text-muted)]">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading financial data...
        </div>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { profile: onboardingProfile } = useOnboardingProfile();

    // Use onboarding profile health score if available
    const displayHealthScore = onboardingProfile?.health_score ?? 0;
    const displayBadge = onboardingProfile?.personality_badge;
    const displayRisk = onboardingProfile?.risk_category;
    const displayInsights = onboardingProfile?.ai_insights ?? [];

    // Avoid SSR hydration mismatch: read localStorage only on client after mount
    const [username, setUsername] = useState("User");
    const [onboardingChecked, setOnboardingChecked] = useState(false);

    // Real data from questionnaire
    const [totalIncome, setTotalIncome] = useState(0);
    const [savingsPercent, setSavingsPercent] = useState(0);
    const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});
    const [debtStatus, setDebtStatus] = useState(0);
    const [emergencyFund, setEmergencyFund] = useState(0);
    const [primaryGoal, setPrimaryGoal] = useState("");
    const [goalAmount, setGoalAmount] = useState(0);
    const [goalTimeframe, setGoalTimeframe] = useState("");

    // Real Goals SWR Fetching
    const { data: goalsData, mutate: mutateGoals } = useSWR('http://localhost:8080/api/dashboard/goals', fetcher);
    const realGoals = goalsData?.goals || [];

    // Modal States
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [isSubmittingGoal, setIsSubmittingGoal] = useState(false);
    const [newGoalForm, setNewGoalForm] = useState({
        title: "",
        target_amount: "",
        deadline: "",
        category: "General"
    });

    // Zero-state initialization: Push onboarding goal
    const [hasAttemptedGoalSync, setHasAttemptedGoalSync] = useState(false);

    useEffect(() => {
        if (!goalsData || hasAttemptedGoalSync) return;

        if (goalsData.success && realGoals.length === 0 && primaryGoal && primaryGoal !== "Not set") {
            const tempNetSavings = totalIncome - Object.values(categorySpending).reduce((sum, v) => sum + v, 0);
            const initialGoal = {
                title: primaryGoal,
                target_amount: goalAmount > 0 ? goalAmount : totalIncome * 12,
                current_amount: tempNetSavings > 0 ? tempNetSavings * 3 : 0,
                deadline: null,
                category: "primary"
            };

            fetch('http://localhost:8080/api/dashboard/goals', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initialGoal),
            })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        mutateGoals();
                    }
                })
                .catch(console.error);
        }
        setHasAttemptedGoalSync(true);
    }, [goalsData, hasAttemptedGoalSync, primaryGoal, goalAmount, totalIncome, categorySpending, mutateGoals]);

    useEffect(() => {
        // Gate: redirect to auth if not logged in
        const token = localStorage.getItem("session_token");
        if (!token) {
            window.location.href = "/auth";
            return;
        }

        const stored = localStorage.getItem("username");
        if (stored) setUsername(stored);

        // Gate: redirect to onboarding if not completed
        const profile = localStorage.getItem("onboarding_profile");
        if (!profile) {
            window.location.href = "/onboarding";
            return;
        }

        // Parse raw questionnaire answers
        try {
            const parsed = JSON.parse(profile);
            const rawAnswers = localStorage.getItem("questionnaire_answers");
            if (rawAnswers) {
                const answers = JSON.parse(rawAnswers);
                setTotalIncome(answers.monthly_income || 0);
                setSavingsPercent(answers.savings_percentage || 0);
                setCategorySpending(answers.category_spending || {});
                setDebtStatus(answers.debt_status || 0);
                setEmergencyFund(answers.emergency_fund || 0);
                setGoalAmount(answers.goal_amount || 0);
                setGoalTimeframe(answers.goal_timeframe || "Not sure");

                const goalLabels = [
                    "Building an emergency fund",
                    "Better budgeting & expense control",
                    "Paying off debts/EMIs",
                    "Saving for a major goal",
                    "Improving saving discipline",
                    "Understanding finances better",
                    "Not sure yet",
                ];
                setPrimaryGoal(goalLabels[answers.primary_goal] || "Not set");
            } else {
                setSavingsPercent(Math.round((parsed.savings_ratio || 0.15) * 100));
                setTotalIncome(50000);
            }
        } catch {
            // ignore parse errors
        }

        setOnboardingChecked(true);
    }, []);

    const handleGoalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingGoal(true);
        try {
            const payload = {
                title: newGoalForm.title,
                target_amount: Number(newGoalForm.target_amount),
                current_amount: 0,
                deadline: newGoalForm.deadline || undefined,
                category: newGoalForm.category,
            };
            const response = await fetch("http://localhost:8080/api/dashboard/goals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (result.success) {
                setShowGoalModal(false);
                setNewGoalForm({ title: "", target_amount: "", deadline: "", category: "General" });
                mutateGoals();
                toast.success("Goal added successfully!");
            } else {
                toast.error(result.error || "Failed to add goal");
            }
        } catch (error) {
            toast.error("Failed to connect to server");
            console.error(error);
        } finally {
            setIsSubmittingGoal(true);
        }
    };

    // ── Derived values ──
    const totalSpent = Object.values(categorySpending).reduce((sum, v) => sum + v, 0);
    const netSavings = totalIncome - totalSpent;

    // Category chart data
    const CATEGORY_COLORS: Record<string, string> = {
        "Rent / Housing": "#3b82f6",
        "Food & Dining": "#60a5fa",
        "Shopping / Lifestyle": "#818cf8",
        "Bills & Utilities": "#a78bfa",
        "Transportation": "#c084fc",
        "Family Expenses": "#6366f1",
        "Subscriptions & Entertainment": "#38bdf8",
    };

    const chartData = Object.entries(categorySpending)
        .filter(([, amount]) => amount > 0)
        .map(([category, total]) => ({
            category: category.length > 12 ? category.split(" / ")[0].split(" & ")[0] : category,
            fullName: category,
            total,
            color: CATEGORY_COLORS[category] || "#94a3b8",
            percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 100) : 0,
        }));

    // 6-month trend (current month uses real data, previous months have slight variation)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const monthIdx = (now.getMonth() - 5 + i + 12) % 12;
        const isCurrentMonth = i === 5;
        // Small deterministic variation per month
        const factor = [0.92, 0.97, 0.88, 1.05, 0.95, 1.0][i];
        return {
            month: monthNames[monthIdx],
            income: isCurrentMonth ? totalIncome : Math.round(totalIncome * factor),
            spending: isCurrentMonth ? totalSpent : Math.round(totalSpent * factor),
        };
    });

    // Smart alerts from real data
    const debtLabels = ["No debt", "Small & manageable", "Moderate debt burden", "High debt burden", "Undisclosed"];
    const emergencyLabels = ["No emergency fund", "Less than 1 month", "1–3 months", "3–6 months", "More than 6 months"];
    const alerts: { id: string; message: string; severity: "low" | "medium" | "high" }[] = [];

    if (totalIncome > 0 && totalSpent > totalIncome * 0.9) {
        alerts.push({ id: "overspend", message: `Spending ${Math.round((totalSpent / totalIncome) * 100)}% of income. Reduce discretionary expenses.`, severity: "high" });
    }
    if (debtStatus >= 2) {
        alerts.push({ id: "debt", message: `Debt: ${debtLabels[debtStatus]}. Prioritize clearing high-interest EMIs.`, severity: debtStatus >= 3 ? "high" : "medium" });
    }
    if (emergencyFund <= 1) {
        alerts.push({ id: "emergency", message: `Emergency fund: ${emergencyLabels[emergencyFund]}. Aim for 3-6 months of expenses.`, severity: "high" });
    }
    if (savingsPercent < 20 && totalIncome > 0) {
        alerts.push({ id: "savings_low", message: `Savings rate is ${savingsPercent}% — 50-30-20 rule recommends ≥ 20%.`, severity: savingsPercent < 10 ? "high" : "medium" });
    }
    if (alerts.length === 0) {
        alerts.push({ id: "good", message: "Your finances look healthy! Keep maintaining your good habits.", severity: "low" });
    }

    // Goals UI mapping
    const goals = realGoals.length > 0 ? realGoals : [];

    // Simulator Mini Data
    const miniProjectionData = Array.from({ length: 6 }, (_, i) => {
        const base = 50000;
        const currentAdd = netSavings > 0 ? netSavings : 0;
        const optimizedAdd = currentAdd + (totalIncome * 0.15); // AI optimizes ~15% more
        return {
            month: `M${i + 1}`,
            current: base + (i * currentAdd),
            optimized: base + (i * optimizedAdd)
        };
    });

    // Fire toast on high-severity alerts
    useEffect(() => {
        const highAlerts = alerts.filter((a) => a.severity === "high");
        highAlerts.forEach((alert) => {
            toast.error(alert.message, {
                id: alert.id,
                duration: 6000,
                style: {
                    background: "#ffffff",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.2)",
                },
                icon: "🚨",
            });
        });
    }, [onboardingChecked]);

    // Don't render until onboarding check passes (placed after ALL hooks)
    if (!onboardingChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } },
    };
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div className="min-h-screen">
            <Navbar />
            <Toaster position="top-right" />

            <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                    <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                        Good Morning, <span className="text-gradient">{username}</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-[var(--color-text-muted)]">
                            Here&apos;s your financial overview for {getCurrentMonthYear()}
                        </p>
                        {displayBadge && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium">
                                <Award className="w-3 h-3" />
                                {displayBadge}
                            </span>
                        )}
                    </div>
                </motion.div>



                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
                    {/* Stats Row */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard label="Monthly Income" value={formatCurrency(totalIncome)} change={`${savingsPercent}% saved`} icon={TrendingUp} positive />
                        <StatCard label="Total Spending" value={formatCurrency(totalSpent)} change={`${chartData.length} categories`} icon={Wallet} positive={totalSpent < totalIncome} />
                        <StatCard label="Net Savings" value={formatCurrency(netSavings)} change={netSavings > 0 ? `+${Math.round((netSavings / totalIncome) * 100)}%` : "Negative"} icon={Target} positive={netSavings > 0} />
                        <StatCard label="Savings Rate" value={`${savingsPercent}%`} change={savingsPercent >= 20 ? "Healthy" : "Below 20%"} icon={ShieldCheck} positive={savingsPercent >= 20} />
                    </motion.div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Area Chart */}
                        <motion.div variants={itemVariants} className="card p-6 lg:col-span-2">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">Income vs Spending</h2>
                            <p className="text-sm text-[var(--color-text-muted)] mb-6">6-month trend</p>
                            <ResponsiveContainer width="100%" height={260}>
                                <AreaChart data={monthlyTrend}>
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="month" stroke="var(--color-text-dim)" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
                                    <YAxis stroke="var(--color-text-dim)" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="income" stroke="#06b6d4" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                                    <Area type="monotone" dataKey="spending" stroke="#f87171" fill="url(#spendGrad)" strokeWidth={2} name="Spending" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Health Score */}
                        <motion.div variants={itemVariants} className="card p-6 flex flex-col items-center justify-center">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Financial Health</h2>
                            <HealthScoreGauge score={displayHealthScore} trend={displayHealthScore >= 50 ? "stable" : "needs attention"} />
                            <div className="mt-4 flex flex-col items-center gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                    <span className="text-blue-300 capitalize">{displayHealthScore >= 75 ? "Strong" : displayHealthScore >= 50 ? "Stable" : "Needs Work"}</span>
                                </div>
                                {displayRisk && (
                                    <span className="text-xs text-[var(--color-text-dim)]">
                                        Risk Profile: {displayRisk}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    </div>
                    {
                        displayInsights.length > 0 && (
                            <motion.div variants={itemVariants} className="card p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">AI Insights</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {displayInsights.map((insight, i) => {
                                        const borderColor = insight.priority === "high"
                                            ? "border-red-500/20 bg-red-500/5"
                                            : insight.priority === "medium"
                                                ? "border-yellow-500/20 bg-yellow-500/5"
                                                : "border-blue-500/20 bg-blue-500/5";
                                        return (
                                            <div key={i} className={cn("p-4 rounded-xl border", borderColor)}>
                                                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{insight.title}</h3>
                                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{insight.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )
                    }

                    {/* Spending + Alerts + Goals */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Donut */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Spending Breakdown</h2>
                            {chartData.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">No spending data yet</p> : (
                                <>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="total" nameKey="category">
                                                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip content={({ active, payload }) =>
                                                active && payload?.[0] ? (
                                                    <div className="glass-strong rounded-lg p-2 text-xs">
                                                        <p className="text-[var(--color-text-primary)] font-medium">{payload[0].name}</p>
                                                        <p className="text-blue-300">{formatCurrency(payload[0].value as number)}</p>
                                                    </div>
                                                ) : null
                                            } />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="space-y-2 mt-2">
                                        {chartData.map((cat) => (
                                            <div key={cat.category} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                                                    <span className="text-[var(--color-text-muted)]">{cat.category}</span>
                                                </div>
                                                <span className="text-[var(--color-text-secondary)] font-medium">{formatCurrency(cat.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>

                        {/* Alerts */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Alerts</h2>
                                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <Bell className="w-3.5 h-3.5 text-red-400" />
                                </div>
                            </div>
                            {
                                <div className="space-y-3">
                                    {alerts.map((alert) => (
                                        <motion.div
                                            key={alert.id} whileHover={{ x: 4 }}
                                            className={cn("p-3 rounded-xl border text-sm", severityStyles[alert.severity])}
                                        >
                                            <div className="flex items-start gap-2">
                                                {alert.severity === "high" ? <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                                                <p>{alert.message}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            }
                        </motion.div>

                        {/* Goals */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Savings Goals</h2>
                                <button onClick={() => setShowGoalModal(true)} className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center hover:bg-blue-500/20 transition-colors cursor-pointer">
                                    <Plus className="w-4 h-4 text-blue-400" />
                                </button>
                            </div>
                            {goals.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">Set a goal in onboarding to track progress</p> : (
                                <div className="space-y-4">
                                    {goals.map((goal: any) => {
                                        const progress = (goal.current_amount / goal.target_amount) * 100;
                                        return (
                                            <div key={goal.id ?? goal.title}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div>
                                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{goal.title}</span>
                                                        <span className="text-xs text-[var(--color-text-muted)] block mt-0.5" style={{ textTransform: 'capitalize' }}>
                                                            Target: {goal.deadline}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-blue-400">{progress.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                                                        style={{ boxShadow: "0 0 12px rgba(6, 182, 212, 0.3)" }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-[var(--color-text-dim)] mt-1">
                                                    <span>{formatCurrency(goal.current_amount)}</span>
                                                    <span>{formatCurrency(goal.target_amount)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Bar Chart & Simulator Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Category Breakdown</h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="category" stroke="var(--color-text-dim)" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                                    <YAxis stroke="var(--color-text-dim)" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="total" radius={[6, 6, 0, 0]} name="Spending">
                                        {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        <motion.div variants={itemVariants} className="card p-6 border-blue-500/20 relative overflow-hidden flex flex-col justify-between">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] -z-10" />
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <LineChartIcon className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">AI Financial Future Forecast</h2>
                                </div>
                                <p className="text-sm text-[var(--color-text-muted)] mb-4">6-Month Trajectory Simulator</p>

                                <div className="h-[150px] w-full mb-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={miniProjectionData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
                                            <YAxis hide domain={['dataMin', 'dataMax']} />
                                            <Area
                                                type="monotone" dataKey="optimized" stroke="#06b6d4" fill="transparent"
                                                strokeWidth={3} strokeDasharray="5 5" name="AI Optimized"
                                            />
                                            <Area
                                                type="monotone" dataKey="current" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6"
                                                strokeWidth={3} name="Current Path"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-between items-center text-xs px-2 mb-4">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-[var(--color-text-muted)]">Current</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-cyan-500 bg-transparent" /> <span className="text-cyan-400">AI Optimized</span></div>
                                </div>
                            </div>
                            <Link href="/simulator" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border border-blue-500/20 font-semibold text-sm transition-colors cursor-pointer">
                                Open Simulator <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                    </div>


                </motion.div >
            </main >

            <AnimatePresence>
                {showGoalModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-[var(--color-bg-primary)] rounded-2xl border border-[var(--color-border)] shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
                                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">New Savings Goal</h3>
                                <button onClick={() => setShowGoalModal(false)} className="p-1 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleGoalSubmit} className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">Goal Title</label>
                                    <input
                                        type="text" required
                                        value={newGoalForm.title} onChange={e => setNewGoalForm({ ...newGoalForm, title: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-sm text-[var(--color-text-primary)] focus:border-blue-500/50 outline-none"
                                        placeholder="e.g. Dream Home Downpayment"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Target Amount (₹)</label>
                                        <input
                                            type="number" required min="1"
                                            value={newGoalForm.target_amount} onChange={e => setNewGoalForm({ ...newGoalForm, target_amount: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-sm text-[var(--color-text-primary)] focus:border-blue-500/50 outline-none"
                                            placeholder="500000"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Target Date</label>
                                        <input
                                            type="date"
                                            value={newGoalForm.deadline} onChange={e => setNewGoalForm({ ...newGoalForm, deadline: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-sm text-[var(--color-text-primary)] focus:border-blue-500/50 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)]">Category</label>
                                    <select
                                        value={newGoalForm.category} onChange={e => setNewGoalForm({ ...newGoalForm, category: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-sm text-[var(--color-text-primary)] focus:border-blue-500/50 outline-none"
                                    >
                                        <option value="General">General</option>
                                        <option value="Housing">Housing</option>
                                        <option value="Vehicle">Vehicle</option>
                                        <option value="Education">Education</option>
                                        <option value="Emergency">Emergency Fund</option>
                                        <option value="Retirement">Retirement</option>
                                    </select>
                                </div>
                                <div className="pt-2">
                                    <button
                                        type="submit" disabled={isSubmittingGoal}
                                        className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-500 transition-all flex justify-center items-center cursor-pointer"
                                    >
                                        {isSubmittingGoal ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Goal"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
