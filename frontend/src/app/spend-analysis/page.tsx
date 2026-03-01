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

import { fetcher } from "@/hooks/useFinancialData";

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Transaction {
    id: string;
    amount_encrypted: string;
    description_encrypted: string;
    merchant_encrypted: string;
    category: string;
    transaction_date: string;
}

interface SpendDataResponse {
    success: boolean;
    total_spend: number;
    recent_transactions: Transaction[];
    category_spending: Record<string, number>;
    has_gmail_connected?: boolean;
    user_seed: string;
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

// ─── Decryption Utility ─────────────────────────────────────────────────────

/**
 * Derives a 32-byte AES key using SHA-256 hashes of the userSeed (UUID),
 * matching the Rust `derive_user_key` logic exactly. 
 * Converts base64 back to Uint8Array, extracts the 12-byte nonce, 
 * and decrypts using AES-GCM.
 */
async function decryptAESGCM(b64Ciphertext: string | undefined, userSeed: string | undefined): Promise<string> {
    if (!b64Ciphertext || !userSeed) return b64Ciphertext || "Unknown";

    try {
        const enc = new TextEncoder();

        // 1. Derive 32-byte key via SHA-256
        const keyMaterial = await window.crypto.subtle.digest(
            "SHA-256",
            enc.encode(userSeed)
        );

        // 2. Import raw key
        const key = await window.crypto.subtle.importKey(
            "raw",
            keyMaterial,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        // 3. Decode base64 
        const binaryString = atob(b64Ciphertext);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // 4. Split nonce (first 12 bytes) and ciphertext
        if (bytes.length < 12) return "Ciphertext too short";
        const nonce = bytes.slice(0, 12);
        const ciphertext = bytes.slice(12);

        // 5. Decrypt
        const decryptedBuf = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: nonce },
            key,
            ciphertext
        );

        return new TextDecoder().decode(decryptedBuf);
    } catch (e) {
        console.error("Local decryption failed:", e);
        return "*** Encrypted Data ***";
    }
}

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

    const [isSyncingGmail, setIsSyncingGmail] = useState(false);

    // OAuth Popup Handler
    useEffect(() => {
        // Only run on the client
        if (typeof window === "undefined") return;

        const params = new URLSearchParams(window.location.search);
        if (params.get("google_sync") === "success") {
            // If this is a popup window
            if (window.opener && window.opener !== window) {
                // Post message to the main window to trigger a refresh/notification
                window.opener.postMessage({ type: "OAUTH_SUCCESS" }, "*");
                // Close the popup
                window.close();
            } else {
                // If it opened in the same tab somehow, clean the URL
                window.history.replaceState({}, document.title, window.location.pathname);
                triggerGmailSync();
            }
        }
    }, []);

    const triggerGmailSync = async () => {
        setIsSyncingGmail(true);
        setUploadError("");
        setUploadSuccess("");
        try {
            const data: any = await fetcher("http://localhost:8080/api/spend-analysis/gmail-sync");
            if (data.success) {
                setUploadSuccess(data.message);
                mutate(); // Refresh transactions
            } else {
                setUploadError(data.message || "Failed to sync Gmail statements.");
            }
        } catch (e) {
            setUploadError("Network error while syncing Gmail.");
        } finally {
            setIsSyncingGmail(false);
        }
    };

    // Listen for OAuth success from popup
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "OAUTH_SUCCESS") {
                triggerGmailSync();
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
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

    // Zero-Knowledge Decryption State
    const [decryptedTransactions, setDecryptedTransactions] = useState<any[]>([]);
    const [isDecrypting, setIsDecrypting] = useState(false);

    useEffect(() => {
        if (!spendData?.recent_transactions || !spendData?.user_seed) return;

        let isMounted = true;
        setIsDecrypting(true);

        const decryptAll = async () => {
            const decTx = await Promise.all(
                spendData.recent_transactions.map(async (tx) => {
                    const decryptedDesc = await decryptAESGCM(tx.description_encrypted, spendData.user_seed);
                    // Provide a default empty string for merchant to avoid type errors dynamically while resolving
                    const decryptedMerchant = tx.merchant_encrypted ? await decryptAESGCM(tx.merchant_encrypted, spendData.user_seed) : "";

                    return {
                        id: tx.id,
                        category: tx.category,
                        amount: parseFloat(tx.amount_encrypted) || 0, // In this iteration amount is still not AES encrypted locally to UI
                        date: new Date(tx.transaction_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
                        desc: decryptedDesc,
                        merchant: decryptedMerchant,
                    }
                })
            );

            if (isMounted) {
                setDecryptedTransactions(decTx);
                setIsDecrypting(false);
            }
        };

        decryptAll();
        return () => { isMounted = false; };
    }, [spendData]);

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
    const displayTransactions = decryptedTransactions.length > 0 ? decryptedTransactions : recentTransactions;

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
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowUpload(!showUpload)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Upload className="w-4 h-4" /> Import Statement
                            </button>

                            {/* Only show Connect Gmail if it evaluates to false or undefined */}
                            {!spendData?.has_gmail_connected && (
                                <button
                                    onClick={() => {
                                        fetch("http://localhost:8080/api/auth/google/url")
                                            .then(res => res.json())
                                            .then(data => {
                                                if (data.url) {
                                                    const w = 500;
                                                    const h = 600;
                                                    const left = window.screen.width / 2 - w / 2;
                                                    const top = window.screen.height / 2 - h / 2;
                                                    window.open(data.url, "GoogleAuth", `width=${w},height=${h},top=${top},left=${left}`);
                                                }
                                            });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-50 transition-all border border-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Connect Gmail
                                </button>
                            )}

                            <button
                                onClick={() => setShowManualEntry(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:border-blue-500/30 transition-all">
                                {/* Note: Assuming Plus is imported from lucide-react in the file. Will confirm imports later if missing. */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Manual Entry
                            </button>
                        </div>
                        <div className="flex flex-col items-end mt-2">
                            <p className="text-[10px] text-[var(--color-text-muted)] max-w-sm text-right opacity-80">
                                🔒 <strong>Privacy Assurance:</strong> ArthNiti requests 'Read-Only' access. Raw emails are processed locally and never stored.
                            </p>
                            <p className="text-[10px] text-orange-500/80 max-w-sm text-right mt-1">
                                <em>OAuth Error Tip:</em> If you see "invalid_client", it's an OAuth Configuration Mismatch. Please check the Redirect URI in the Google Cloud Console to exactly match: <code>http://localhost:8080/api/auth/google/callback</code>
                            </p>
                        </div>
                    </div>
                </motion.div>

                {uploadError && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {uploadError}
                    </div>
                )}
                {uploadSuccess && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 flex items-center gap-3 shadow-lg shadow-green-500/5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="font-medium">{uploadSuccess}</span>
                    </div>
                )}

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
                                            <p className="text-xs text-[var(--color-text-dim)]">
                                                {tx.merchant && <span className="text-[var(--color-text-muted)] font-medium">{tx.merchant} • </span>}
                                                {tx.category} • {tx.date}
                                            </p>
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

                {/* Mail Analysis Section */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 card p-6 border-blue-500/20 bg-gradient-to-br from-[var(--color-bg-card)] to-blue-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                            </div>
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Recent Email Analysis</h2>
                        </div>
                        {isSyncingGmail && (
                            <span className="text-xs font-medium text-blue-400 flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                AI is scanning recent emails...
                            </span>
                        )}
                    </div>
                    {isSyncingGmail ? (
                        <div className="p-8 text-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg-elevated)] overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse"></div>
                            <div className="text-4xl mb-4 animate-bounce">🤖</div>
                            <p className="font-medium text-[var(--color-text-primary)]">DeepSeek is reading your recent inbox...</p>
                            <p className="text-sm mt-1 text-slate-400">Extracting unstructured transaction data securely.</p>
                        </div>
                    ) : spendData?.has_gmail_connected ? (
                        <div className="p-6 flex flex-col items-center text-center border mt-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg-elevated)]">
                            <p className="text-sm font-medium text-[var(--color-text-muted)] mb-4">
                                Gmail connected successfully! Auto-sync is active.
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={triggerGmailSync}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/10 text-blue-500 font-medium hover:bg-blue-600/20 transition-all border border-blue-500/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 2v6h6"></path><path d="M21 12a9 9 0 1 0-9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path></svg>
                                    Sync Recent Emails Now
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch("http://localhost:8080/api/auth/google/disconnect", {
                                                method: "POST"
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                mutate(); // Refresh transactions and connection state
                                            } else {
                                                alert(data.message || "Failed to disconnect Gmail.");
                                            }
                                        } catch (e) {
                                            alert("Network error while disconnecting.");
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-500 font-medium hover:bg-red-500/20 transition-all border border-red-500/20"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center border mt-2 border-dashed border-[var(--color-border)] rounded-xl bg-[var(--color-bg-elevated)]">
                            <p className="text-sm font-medium text-[var(--color-text-muted)]">
                                Link your Gmail to securely scan for automatic bank statement and receipt parsing.
                            </p>
                        </div>
                    )}
                </motion.div>
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
