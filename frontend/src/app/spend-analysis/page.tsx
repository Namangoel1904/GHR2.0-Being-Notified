"use client";

import { useState, useEffect, useMemo } from "react";
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
    Calendar,
    X,
    ShieldCheck,
    Sparkles,
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
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Transaction {
    id: string;
    amount_encrypted: string;
    description_encrypted: string;
    category: string;
    transaction_date: string;
}

interface SpendDataResponse {
    success: boolean;
    total_spend: number;
    recent_transactions: Transaction[];
    category_spending: Record<string, number>;
}

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
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");

    // Monthly Budget State
    const [monthlyBudget, setMonthlyBudget] = useState(50000);

    useEffect(() => {
        try {
            const savedProfile = localStorage.getItem("onboarding_profile");
            if (savedProfile) {
                const parsed = JSON.parse(savedProfile);
                if (parsed.answers && parsed.answers.category_spending) {
                    const spendingObj = parsed.answers.category_spending;
                    const sum = Object.values(spendingObj).reduce((acc: number, val: any) => acc + Number(val || 0), 0);
                    if (sum > 0) {
                        setMonthlyBudget(sum as number);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to parse onboarding profile for budget", e);
        }
    }, []);

    // Manual Entry State
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const [manualForm, setManualForm] = useState({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        category: "Food & Dining",
        payment_mode: "UPI",
        description: "",
    });

    const { data: spendData, mutate } = useSWR<SpendDataResponse>(
        "http://localhost:8080/api/spend-analysis/data",
        fetcher,
        { refreshInterval: 0 } // Manual refresh after upload
    );

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError("");
        setUploadSuccess("");

        const formData = new FormData();
        formData.append("statement", file);

        try {
            const response = await fetch("http://localhost:8080/api/spend-analysis/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                setUploadSuccess(result.message || "Statement parsed successfully!");
                setShowUpload(false);
                mutate(); // Refresh the data from the backend
            } else {
                setUploadError(result.message || "Failed to parse statement.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            setUploadError("Network error while uploading. Is the server running?");
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingManual(true);
        try {
            const payload = {
                ...manualForm,
                amount: manualForm.category === "Income" ? Math.abs(parseFloat(manualForm.amount)) : -Math.abs(parseFloat(manualForm.amount))
            };
            const response = await fetch("http://localhost:8080/api/spend-analysis/manual", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (result.success) {
                setShowManualEntry(false);
                setManualForm({
                    ...manualForm,
                    amount: "",
                    description: "",
                });
                mutate();
            } else {
                alert(result.message || "Failed to add transaction");
            }
        } catch (error) {
            console.error(error);
            alert("Network error while saving transaction.");
        } finally {
            setIsSubmittingManual(false);
        }
    };

    const totalSpend = spendData?.total_spend || 0;

    // Map dynamic category data to our UI format with icons
    const dynamicCategoryData = Object.entries(spendData?.category_spending || {}).map(([name, amount]) => {
        const iconMap: Record<string, any> = {
            "Food & Dining": Utensils,
            "Transport": Car,
            "Shopping": ShoppingCart,
            "Bills & Utilities": Zap,
            "Entertainment": Film,
            "Health/Medical": Heart,
            "Subscriptions": Calendar,
            "Income": TrendingUp,
        };
        const colorMap: Record<string, string> = {
            "Food & Dining": "#f97316",
            "Transport": "#3b82f6",
            "Shopping": "#a855f7",
            "Bills & Utilities": "#eab308",
            "Entertainment": "#ec4899",
            "Health/Medical": "#06b6d4",
            "Subscriptions": "#8b5cf6",
            "Income": "#10b981",
        };

        return {
            name,
            amount,
            icon: iconMap[name] || MoreHorizontal,
            color: colorMap[name] || "#6b7280",
            pct: totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0,
            trend: "0%", // Dynamic trending requires month-over-month calculation
        }
    });

    const displayCategories = dynamicCategoryData.length > 0 ? dynamicCategoryData : categoryData;
    const displayTransactions = spendData?.recent_transactions && spendData.recent_transactions.length > 0
        ? spendData.recent_transactions.map(tx => ({
            id: tx.id,
            desc: tx.description_encrypted,
            category: tx.category,
            amount: parseFloat(tx.amount_encrypted),
            date: new Date(tx.transaction_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
        }))
        : recentTransactions;

    const dynamicSubscriptions = displayTransactions
        .filter(tx => tx.category === "Subscriptions")
        .map(tx => ({
            name: tx.desc,
            amount: Math.abs(tx.amount),
            renewal: tx.date,
            status: "active"
        }));

    const displaySubscriptions = dynamicSubscriptions.length > 0 ? dynamicSubscriptions : subscriptions;

    const dynamicAlerts = useMemo(() => {
        const generated = [];
        let idCounter = 1;

        if (monthlyBudget > 0) {
            const pct = Math.round((totalSpend / monthlyBudget) * 100);
            if (pct >= 90) {
                generated.push({ id: idCounter++, type: "high", message: `You have utilized ${pct}% of your monthly budget.`, icon: AlertTriangle });
            } else if (pct >= 75) {
                generated.push({ id: idCounter++, type: "medium", message: `You are nearing your budget limit (${pct}%).`, icon: TrendingUp });
            } else {
                generated.push({ id: idCounter++, type: "low", message: `Budget looks healthy at ${pct}% utilized.`, icon: ShieldCheck });
            }
        }

        const expenseCategories = dynamicCategoryData.filter(c => c.name !== "Income");
        if (expenseCategories.length > 0) {
            const highest = [...expenseCategories].sort((a, b) => b.amount - a.amount)[0];
            if (highest && highest.amount > 0) {
                generated.push({ id: idCounter++, type: "medium", message: `${highest.name} is your highest spend this month at ₹${highest.amount.toLocaleString("en-IN")}`, icon: TrendingUp });
            }
        }

        if (expenseCategories.length > 1) {
            const lowest = [...expenseCategories].sort((a, b) => a.amount - b.amount)[0];
            if (lowest && lowest.amount > 0) {
                generated.push({ id: idCounter++, type: "low", message: `${lowest.name} expenses are kept low at ₹${lowest.amount.toLocaleString("en-IN")} — great job!`, icon: TrendingDown });
            }
        }

        if (generated.length === 0) {
            generated.push({ id: 1, type: "low", message: "Add transactions to see personalized insights & anomalies.", icon: Sparkles });
        }

        return generated.slice(0, 3);
    }, [monthlyBudget, totalSpend, dynamicCategoryData]);

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
                        <button
                            onClick={() => setShowManualEntry(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:border-blue-500/30 transition-all">
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
                            <label className={cn(
                                "flex flex-col items-center justify-center w-full card p-8 border-dashed border-2 cursor-pointer transition-all",
                                isUploading ? "border-blue-500/50 bg-blue-500/5" : "border-[var(--color-border)] hover:border-blue-500/50 hover:bg-[var(--color-bg-elevated)]"
                            )}>
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                                            <p className="text-sm font-medium text-blue-400">DeepSeek AI is analyzing your statement...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 text-blue-400 mb-3" />
                                            <p className="text-[var(--color-text-primary)] font-semibold mb-1">
                                                Click to upload your bank statement
                                            </p>
                                            <p className="text-xs text-[var(--color-text-muted)]">
                                                Supports CSV, PDF, and image forms (JPG, PNG)
                                            </p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept=".csv,.pdf,image/png,image/jpeg"
                                    disabled={isUploading}
                                />
                            </label>

                            {uploadError && (
                                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {uploadError}
                                </div>
                            )}
                            {uploadSuccess && (
                                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    {uploadSuccess}
                                </div>
                            )}
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
                                            ₹{monthlyBudget.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className={cn(totalSpend > monthlyBudget ? "text-red-400" : "text-yellow-400")}>
                                            {monthlyBudget > 0 ? Math.round((totalSpend / monthlyBudget) * 100) : 0}% utilized
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1000"
                                        max="500000"
                                        step="1000"
                                        value={monthlyBudget}
                                        onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                                        className="w-full h-1.5 bg-[var(--color-border)] rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="card p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--color-text-muted)]">Subscriptions</p>
                                        <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                                            ₹{displaySubscriptions.reduce((s, sub) => s + sub.amount, 0).toLocaleString("en-IN")}/mo
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs text-[var(--color-text-dim)]">{displaySubscriptions.length} active</p>
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
                                            data={displayCategories}
                                            dataKey="amount"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={110}
                                            paddingAngle={3}
                                            strokeWidth={0}
                                        >
                                            {displayCategories.map((entry, i) => (
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
                                {displayCategories.map((cat) => {
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
                                {dynamicAlerts.map((alert) => {
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
                            {displayTransactions.map((tx) => (
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
                            {displaySubscriptions.map((sub, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)] hover:border-blue-500/20 transition-all">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{sub.name.replace(/\[.*\]\s/, "")}</p>
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
                                💡 Monthly subscription cost: ₹{displaySubscriptions.reduce((s, sub) => s + sub.amount, 0).toLocaleString("en-IN")}
                            </p>
                        </div>
                    </motion.div>
                )}
                <AnimatePresence>
                    {showManualEntry && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md p-6 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-2xl relative"
                            >
                                <button
                                    onClick={() => setShowManualEntry(false)}
                                    className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Add Transaction</h2>
                                <form onSubmit={handleManualSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-text-dim)] mb-1 uppercase tracking-wider">Date</label>
                                        <input
                                            type="date"
                                            value={manualForm.date}
                                            onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                                            className="w-full p-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-[var(--color-text-dim)] mb-1 uppercase tracking-wider">Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={manualForm.amount}
                                                onChange={e => setManualForm({ ...manualForm, amount: e.target.value })}
                                                placeholder="e.g. 500"
                                                className="w-full p-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-blue-500 outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-[var(--color-text-dim)] mb-1 uppercase tracking-wider">Payment Mode</label>
                                            <select
                                                value={manualForm.payment_mode}
                                                onChange={e => setManualForm({ ...manualForm, payment_mode: e.target.value })}
                                                className="w-full p-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-blue-500 outline-none"
                                            >
                                                <option value="UPI">UPI</option>
                                                <option value="Credit Card">Credit Card</option>
                                                <option value="Debit Card">Debit Card</option>
                                                <option value="Net Banking">Net Banking</option>
                                                <option value="Cash">Cash</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-text-dim)] mb-1 uppercase tracking-wider">Category</label>
                                        <select
                                            value={manualForm.category}
                                            onChange={e => setManualForm({ ...manualForm, category: e.target.value })}
                                            className="w-full p-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-blue-500 outline-none"
                                        >
                                            <option>Food & Dining</option>
                                            <option>Transport</option>
                                            <option>Shopping</option>
                                            <option>Bills & Utilities</option>
                                            <option>Entertainment</option>
                                            <option>Health/Medical</option>
                                            <option>Phone & Internet</option>
                                            <option>Subscriptions</option>
                                            <option>Others</option>
                                            <option>Income</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--color-text-dim)] mb-1 uppercase tracking-wider">Description</label>
                                        <input
                                            type="text"
                                            value={manualForm.description}
                                            onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                                            placeholder="What was this for?"
                                            className="w-full p-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-blue-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingManual}
                                        className="w-full py-3 rounded-xl bg-blue-600 font-semibold text-white hover:bg-blue-500 transition-all disabled:opacity-50 mt-2"
                                    >
                                        {isSubmittingManual ? "Saving..." : "Save Transaction"}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
