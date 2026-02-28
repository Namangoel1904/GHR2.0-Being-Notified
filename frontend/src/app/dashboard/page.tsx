"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import { cn, formatCurrency } from "@/lib/utils";
import {
    useSpendingAnalysis,
    useAlerts,
    useGoals,
    useHealthScore,
} from "@/hooks/useFinancialData";

// ─── Color Palette for Charts ───────────────────────────────────────────────

const CHART_COLORS = [
    "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#059669", "#047857",
];

// 6-month trend (static — would come from a /api/dashboard/trend endpoint)
const monthlyTrend = [
    { month: "Sep", income: 5200, spending: 3100 },
    { month: "Oct", income: 5200, spending: 3400 },
    { month: "Nov", income: 5500, spending: 2900 },
    { month: "Dec", income: 5800, spending: 4200 },
    { month: "Jan", income: 5200, spending: 3180 },
    { month: "Feb", income: 5400, spending: 3450 },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function HealthScoreGauge({ score, trend }: { score: number; trend: string }) {
    const circumference = 2 * Math.PI * 60;
    const progress = (score / 100) * circumference;
    const color = score >= 75 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";

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
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg",
                    positive ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
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
    low: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
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
    const { spending, isLoading: spendingLoading, error: spendingError, refresh: refreshSpending } = useSpendingAnalysis();
    const { alerts, isLoading: alertsLoading, error: alertsError, refresh: refreshAlerts } = useAlerts();
    const { goals, isLoading: goalsLoading, refresh: refreshGoals } = useGoals();
    const { healthScore, isLoading: healthLoading } = useHealthScore();

    const totalSpending = spending?.total_spending ?? 0;
    const totalIncome = 5400; // Would come from a /api/dashboard/income endpoint
    const savings = totalIncome - totalSpending;

    // Spending data mapped for recharts
    const chartData = (spending?.categories ?? []).map((c, i) => ({
        ...c,
        color: CHART_COLORS[i % CHART_COLORS.length],
    }));

    // Fire toast on new high-severity alerts
    useEffect(() => {
        const highAlerts = alerts.filter((a) => a.severity === "high");
        highAlerts.forEach((alert) => {
            toast.error(alert.message, {
                id: alert.id, // Deduplicate
                duration: 6000,
                style: {
                    background: "#1e1e1e",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.2)",
                },
                icon: "🚨",
            });
        });
    }, [alerts]);

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
                        Good Morning, <span className="text-gradient">Naman</span>
                    </h1>
                    <p className="text-[var(--color-text-muted)] mt-1">
                        Here&apos;s your financial overview for {spending?.month ?? "February 2026"}
                    </p>
                </motion.div>

                {/* Error banners */}
                {spendingError && <ErrorBanner message="Backend disconnected — showing cached data" onRetry={refreshSpending} />}

                <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
                    {/* Stats Row */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard label="Monthly Income" value={formatCurrency(totalIncome)} change="+3.8%" icon={TrendingUp} positive isLoading={spendingLoading} />
                        <StatCard label="Total Spending" value={formatCurrency(totalSpending)} change="+8.5%" icon={Wallet} positive={false} isLoading={spendingLoading} />
                        <StatCard label="Net Savings" value={formatCurrency(savings)} change={savings > 0 ? "+12%" : "-12%"} icon={Target} positive={savings > 0} isLoading={spendingLoading} />
                        <StatCard label="Encryption" value="AES-256" change="Active" icon={ShieldCheck} positive />
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
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                    <Area type="monotone" dataKey="income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                                    <Area type="monotone" dataKey="spending" stroke="#f87171" fill="url(#spendGrad)" strokeWidth={2} name="Spending" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Health Score */}
                        <motion.div variants={itemVariants} className="card p-6 flex flex-col items-center justify-center">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Financial Health</h2>
                            {healthLoading ? (
                                <div className="w-40 h-40 rounded-full bg-[var(--color-bg-elevated)] animate-pulse" />
                            ) : (
                                <HealthScoreGauge score={healthScore?.health_score ?? 0} trend={healthScore?.trend ?? ""} />
                            )}
                            <div className="mt-4 flex items-center gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span className="text-emerald-300 capitalize">{healthScore?.trend ?? "..."}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Spending + Alerts + Goals */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Donut */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Spending Breakdown</h2>
                            {spendingLoading ? <LoadingSkeleton /> : (
                                <>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="total">
                                                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Pie>
                                            <Tooltip content={({ active, payload }) =>
                                                active && payload?.[0] ? (
                                                    <div className="glass-strong rounded-lg p-2 text-xs">
                                                        <p className="text-[var(--color-text-primary)] font-medium">{payload[0].name}</p>
                                                        <p className="text-emerald-300">{formatCurrency(payload[0].value as number)}</p>
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
                            {alertsLoading ? <LoadingSkeleton /> : (
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
                            )}
                        </motion.div>

                        {/* Goals */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Savings Goals</h2>
                                <button className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center hover:bg-emerald-500/20 transition-colors">
                                    <Plus className="w-4 h-4 text-emerald-400" />
                                </button>
                            </div>
                            {goalsLoading ? <LoadingSkeleton /> : (
                                <div className="space-y-4">
                                    {goals.map((goal) => {
                                        const progress = (goal.current_amount / goal.target_amount) * 100;
                                        return (
                                            <div key={goal.id ?? goal.title}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm text-[var(--color-text-secondary)]">{goal.title}</span>
                                                    <span className="text-xs text-[var(--color-text-muted)]">{progress.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                                        style={{ boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)" }}
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

                    {/* Bar Chart */}
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
                </motion.div>
            </main>
        </div>
    );
}
