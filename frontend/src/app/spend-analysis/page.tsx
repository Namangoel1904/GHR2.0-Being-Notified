"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CreditCard,
    Upload,
    Search,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Utensils,
    Car,
    Zap,
    Smartphone,
    Film,
    Heart,
    MoreHorizontal,
    Plus,
    Filter,
    Bell,
    IndianRupee,
} from "lucide-react";
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
    Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const categoryData = [
    { name: "Food & Dining", amount: 12400, icon: Utensils, color: "#f97316", pct: 28, trend: "+5%" },
    { name: "Transport", amount: 5600, icon: Car, color: "#3b82f6", pct: 13, trend: "-2%" },
    { name: "Shopping", amount: 8900, icon: ShoppingCart, color: "#a855f7", pct: 20, trend: "+12%" },
    { name: "Bills & Utilities", amount: 6200, icon: Zap, color: "#eab308", pct: 14, trend: "0%" },
    { name: "Entertainment", amount: 4300, icon: Film, color: "#ec4899", pct: 10, trend: "+8%" },
    { name: "Health/Medical", amount: 3200, icon: Heart, color: "#06b6d4", pct: 7, trend: "-3%" },
    { name: "Phone & Internet", amount: 1800, icon: Smartphone, color: "#06b6d4", pct: 4, trend: "0%" },
    { name: "Others", amount: 1600, icon: MoreHorizontal, color: "#6b7280", pct: 4, trend: "+1%" },
];

const monthlySpend = [
    { month: "Sep", amount: 38000 },
    { month: "Oct", amount: 41200 },
    { month: "Nov", amount: 36800 },
    { month: "Dec", amount: 48500 },
    { month: "Jan", amount: 43200 },
    { month: "Feb", amount: 44000 },
];

const subscriptions = [
    { name: "Netflix", amount: 649, renewal: "Mar 15", status: "active" },
    { name: "Spotify", amount: 119, renewal: "Mar 1", status: "active" },
    { name: "Gym Membership", amount: 2500, renewal: "Mar 10", status: "active" },
    { name: "ChatGPT Plus", amount: 1650, renewal: "Mar 5", status: "active" },
    { name: "iCloud 50GB", amount: 75, renewal: "Mar 20", status: "active" },
];

const alerts = [
    { id: 1, type: "high", message: "Shopping spend up 12% vs last month", icon: AlertTriangle },
    { id: 2, type: "medium", message: "₹48,500 in Dec was your highest month this year", icon: TrendingUp },
    { id: 3, type: "low", message: "Health expenses down 3% — great job!", icon: TrendingDown },
];

const recentTransactions = [
    { id: 1, desc: "Swiggy Order", category: "Food", amount: -450, date: "Feb 28" },
    { id: 2, desc: "Amazon Purchase", category: "Shopping", amount: -2199, date: "Feb 27" },
    { id: 3, desc: "Uber Ride", category: "Transport", amount: -180, date: "Feb 27" },
    { id: 4, desc: "Electricity Bill", category: "Bills", amount: -1850, date: "Feb 26" },
    { id: 5, desc: "Salary Credit", category: "Income", amount: 85000, date: "Feb 25" },
    { id: 6, desc: "Zomato Gold", category: "Food", amount: -320, date: "Feb 25" },
];

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function SpendAnalysisPage() {
    const [activeView, setActiveView] = useState<"overview" | "transactions" | "subscriptions">("overview");
    const [showUpload, setShowUpload] = useState(false);

    const totalSpend = categoryData.reduce((s, c) => s + c.amount, 0);

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
                            Smart <span className="text-gradient">Spend</span> Analysis
                        </h1>
                        <p className="text-[var(--color-text-muted)] mt-1 text-sm">
                            AI-powered expense tracking & anomaly detection
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowUpload(!showUpload)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                        >
                            <Upload className="w-4 h-4" /> Import Statement
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:border-blue-500/30 transition-all">
                            <Plus className="w-4 h-4" /> Manual Entry
                        </button>
                    </div>
                </motion.div>

                {/* Upload Panel */}
                <AnimatePresence>
                    {showUpload && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mb-6 overflow-hidden"
                        >
                            <div className="card p-6 border-dashed border-2 border-blue-500/30 text-center">
                                <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                                <p className="text-[var(--color-text-primary)] font-semibold mb-1">
                                    Drop your bank statement here
                                </p>
                                <p className="text-xs text-[var(--color-text-muted)] mb-4">
                                    Supports CSV, PDF — or connect via email (n8n integration)
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all">
                                        Browse Files
                                    </button>
                                    <button className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:border-blue-500/30 transition-all">
                                        Connect Email
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* View Tabs */}
                <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-[var(--color-bg-card)] w-fit">
                    {(["overview", "transactions", "subscriptions"] as const).map((view) => (
                        <button
                            key={view}
                            onClick={() => setActiveView(view)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                activeView === view
                                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                            )}
                        >
                            {view}
                        </button>
                    ))}
                </div>

                {activeView === "overview" && (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
                        className="space-y-6"
                    >
                        {/* Top Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <motion.div variants={itemVariants} className="card p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                                        <IndianRupee className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-muted)]">Total Spend</p>
                                        <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                            ₹{totalSpend.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-red-400">+3.2% vs last month</p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="card p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                        <IndianRupee className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-muted)]">Monthly Budget</p>
                                        <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                            ₹50,000
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-yellow-400">88% utilized</p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="card p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-muted)]">Subscriptions</p>
                                        <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                            ₹{subscriptions.reduce((s, sub) => s + sub.amount, 0).toLocaleString("en-IN")}/mo
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--color-text-dim)]">{subscriptions.length} active</p>
                            </motion.div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Category Pie */}
                            <motion.div variants={itemVariants} className="card p-6">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                    Expense Breakdown
                                </h2>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            dataKey="amount"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={110}
                                            paddingAngle={3}
                                            strokeWidth={0}
                                        >
                                            {categoryData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                background: "#ffffff",
                                                border: "1px solid rgba(0,0,0,0.1)",
                                                borderRadius: "12px",
                                                color: "#0f172a",
                                            }}
                                            formatter={(val: number | undefined) => `₹${(val ?? 0).toLocaleString("en-IN")}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </motion.div>

                            {/* Monthly Trend */}
                            <motion.div variants={itemVariants} className="card p-6">
                                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                    Monthly Trend
                                </h2>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={monthlySpend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="month" stroke="rgba(0,0,0,0.3)" tick={{ fontSize: 12 }} />
                                        <YAxis stroke="rgba(0,0,0,0.3)" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                background: "#ffffff",
                                                border: "1px solid rgba(0,0,0,0.1)",
                                                borderRadius: "12px",
                                                color: "#0f172a",
                                            }}
                                            formatter={(val: number | undefined) => `₹${(val ?? 0).toLocaleString("en-IN")}`}
                                        />
                                        <Bar dataKey="amount" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </motion.div>
                        </div>

                        {/* Category Cards */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                Category Breakdown
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {categoryData.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <div
                                            key={cat.name}
                                            className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]/40 hover:border-blue-500/20 transition-all group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                                                    <Icon className="w-4 h-4" style={{ color: cat.color }} />
                                                </div>
                                                <span className="text-xs text-[var(--color-text-muted)]">{cat.pct}%</span>
                                            </div>
                                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                                                ₹{cat.amount.toLocaleString("en-IN")}
                                            </p>
                                            <p className="text-xs text-[var(--color-text-dim)] mt-0.5">{cat.name}</p>
                                            <p className={cn("text-xs mt-1", cat.trend.startsWith("+") ? "text-red-400" : cat.trend.startsWith("-") ? "text-blue-400" : "text-[var(--color-text-dim)]")}>
                                                {cat.trend}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* Alerts */}
                        <motion.div variants={itemVariants} className="card p-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                                Spending Alerts
                            </h2>
                            <div className="space-y-3">
                                {alerts.map((alert) => {
                                    const Icon = alert.icon;
                                    const borderColor = alert.type === "high" ? "border-red-500/20 bg-red-500/5" : alert.type === "medium" ? "border-yellow-500/20 bg-yellow-500/5" : "border-blue-500/20 bg-blue-500/5";
                                    return (
                                        <div key={alert.id} className={cn("p-4 rounded-xl border flex items-center gap-3", borderColor)}>
                                            <Icon className={cn("w-5 h-5 flex-shrink-0", alert.type === "high" ? "text-red-400" : alert.type === "medium" ? "text-yellow-400" : "text-blue-400")} />
                                            <span className="text-sm text-[var(--color-text-primary)]">{alert.message}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {activeView === "transactions" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Transactions</h2>
                            <div className="flex items-center gap-2">
                                <button className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-blue-500/30 transition-all">
                                    <Search className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-blue-500/30 transition-all">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-[var(--color-bg-elevated)] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tx.amount > 0 ? "bg-blue-500/15" : "bg-red-500/10")}>
                                            {tx.amount > 0 ? <TrendingUp className="w-5 h-5 text-blue-400" /> : <CreditCard className="w-5 h-5 text-red-400" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[var(--color-text-primary)]">{tx.desc}</p>
                                            <p className="text-xs text-[var(--color-text-dim)]">{tx.category} · {tx.date}</p>
                                        </div>
                                    </div>
                                    <span className={cn("text-sm font-semibold", tx.amount > 0 ? "text-blue-400" : "text-red-400")}>
                                        {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeView === "subscriptions" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Active Subscriptions</h2>
                        <div className="space-y-3">
                            {subscriptions.map((sub) => (
                                <div key={sub.name} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:border-blue-500/20 transition-all">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{sub.name}</p>
                                        <p className="text-xs text-[var(--color-text-dim)]">Renews {sub.renewal}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">₹{sub.amount}/mo</span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                            {sub.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                            <p className="text-sm text-yellow-300">
                                💡 Monthly subscription cost: ₹{subscriptions.reduce((s, sub) => s + sub.amount, 0).toLocaleString("en-IN")} — Consider reviewing ChatGPT Plus and Gym for potential savings.
                            </p>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
}
