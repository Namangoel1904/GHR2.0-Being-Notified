import useSWR from "swr";
import { API_BASE } from "@/lib/utils";

// ─── Generic Fetcher ────────────────────────────────────────────────────────

async function fetcher<T>(url: string): Promise<T> {
    const res = await fetch(url, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SpendingCategory {
    category: string;
    total: number;
    percentage: number;
    transaction_count: number;
}

export interface SpendingAnalysis {
    total_spending: number;
    categories: SpendingCategory[];
    month: string;
}

export interface Alert {
    id: string;
    alert_type: string;
    message: string;
    severity: "low" | "medium" | "high";
    timestamp: string;
}

export interface Goal {
    id: string;
    title: string;
    target_amount: number;
    current_amount: number;
    category: string;
}

export interface Transaction {
    id: string;
    amount: number;
    description: string;
    category: string;
    transaction_date: string;
    is_flagged: boolean;
}

export interface HealthScore {
    health_score: number;
    last_updated: string;
    trend: string;
}

export interface RiskProfile {
    risk_score: number;
    risk_category: string;
    health_score: number;
    breakdown: {
        savings_ratio: number;
        debt_management: number;
        emergency_fund: number;
        investment_diversity: number;
    };
    recommendations: string[];
}

// ─── Spending Analysis Hook ─────────────────────────────────────────────────

export function useSpendingAnalysis() {
    const { data, error, isLoading, mutate } = useSWR<SpendingAnalysis>(
        `${API_BASE}/api/dashboard/spending-analysis`,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
            errorRetryCount: 3,
            // Fallback while backend is down — matches Rust demo data
            fallbackData: {
                total_spending: 3450,
                categories: [
                    { category: "Housing", total: 1200, percentage: 34.8, transaction_count: 1 },
                    { category: "Food & Dining", total: 650, percentage: 18.8, transaction_count: 24 },
                    { category: "Transportation", total: 450, percentage: 13.0, transaction_count: 15 },
                    { category: "Entertainment", total: 380, percentage: 11.0, transaction_count: 8 },
                    { category: "Utilities", total: 320, percentage: 9.3, transaction_count: 5 },
                    { category: "Shopping", total: 450, percentage: 13.1, transaction_count: 12 },
                ],
                month: "2026-02",
            },
        }
    );

    return { spending: data, isLoading, error, refresh: mutate };
}

// ─── Alerts Hook ────────────────────────────────────────────────────────────

export function useAlerts() {
    const { data, error, isLoading, mutate } = useSWR<Alert[]>(
        `${API_BASE}/api/dashboard/alerts`,
        fetcher,
        {
            refreshInterval: 15000, // Poll every 15s for new alerts
            revalidateOnFocus: true,
            fallbackData: [
                {
                    id: "alert-001",
                    alert_type: "unusual_spending",
                    message: "Your entertainment spending is 45% higher than last month",
                    severity: "medium",
                    timestamp: new Date().toISOString(),
                },
                {
                    id: "alert-002",
                    alert_type: "goal_milestone",
                    message: "You're 80% towards your Emergency Fund goal!",
                    severity: "low",
                    timestamp: new Date().toISOString(),
                },
            ],
        }
    );

    return { alerts: data ?? [], isLoading, error, refresh: mutate };
}

// ─── Goals Hook ─────────────────────────────────────────────────────────────

export function useGoals() {
    const { data, error, isLoading, mutate } = useSWR<{ goals: Goal[] }>(
        `${API_BASE}/api/dashboard/goals`,
        fetcher,
        {
            revalidateOnFocus: false,
            fallbackData: {
                goals: [
                    { id: "g1", title: "Emergency Fund", target_amount: 150000, current_amount: 120000, category: "Safety Net" },
                    { id: "g2", title: "Vacation Fund", target_amount: 80000, current_amount: 32000, category: "Lifestyle" },
                    { id: "g3", title: "New Laptop", target_amount: 100000, current_amount: 65000, category: "Purchase" },
                ],
            },
        }
    );

    return { goals: data?.goals ?? [], isLoading, error, refresh: mutate };
}

// ─── Health Score Hook ──────────────────────────────────────────────────────

export function useHealthScore() {
    const { data, error, isLoading } = useSWR<HealthScore>(
        `${API_BASE}/api/profile/health-score`,
        fetcher,
        {
            revalidateOnFocus: false,
            fallbackData: { health_score: 72, last_updated: new Date().toISOString(), trend: "improving" },
        }
    );

    return { healthScore: data, isLoading, error };
}

// ─── Transactions Hook ─────────────────────────────────────────────────────

export function useTransactions() {
    const { data, error, isLoading, mutate } = useSWR<{ transactions: Transaction[] }>(
        `${API_BASE}/api/dashboard/transactions`,
        fetcher,
        {
            revalidateOnFocus: false,
            fallbackData: { transactions: [] },
        }
    );

    return { transactions: data?.transactions ?? [], isLoading, error, refresh: mutate };
}

// ─── Risk Profile Hook (cached in localStorage for AI prompt) ───────────────

export function useRiskProfile() {
    const { data, error, isLoading } = useSWR<RiskProfile | null>(
        "risk-profile",
        () => {
            // Try localStorage first (set after quiz completion)
            const cached = localStorage.getItem("ghr_risk_profile");
            if (cached) return JSON.parse(cached) as RiskProfile;
            return null;
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    return { riskProfile: data, isLoading, error };
}

export function saveRiskProfile(profile: RiskProfile) {
    localStorage.setItem("ghr_risk_profile", JSON.stringify(profile));
}

// ─── Smart Alert: Unusual Spending Check ────────────────────────────────────

/**
 * Check if a new transaction exceeds the 7-day category average by 200%.
 * Returns alert details if triggered, null otherwise.
 */
export function checkUnusualSpending(
    newAmount: number,
    category: string,
    recentTransactions: Transaction[]
): { triggered: boolean; message: string; multiplier: number } | null {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInCategory = recentTransactions.filter(
        (t) =>
            t.category === category &&
            new Date(t.transaction_date) >= sevenDaysAgo
    );

    if (recentInCategory.length === 0) return null;

    const avgAmount =
        recentInCategory.reduce((sum, t) => sum + t.amount, 0) /
        recentInCategory.length;

    const multiplier = newAmount / avgAmount;

    if (multiplier >= 2.0) {
        return {
            triggered: true,
            message: `Unusual ${category} spending: ₹${newAmount.toLocaleString()} is ${Math.round(multiplier * 100)}% of your 7-day average (₹${Math.round(avgAmount).toLocaleString()})`,
            multiplier,
        };
    }

    return null;
}
