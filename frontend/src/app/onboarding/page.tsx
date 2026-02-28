"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    Shield,
    CheckCircle2,
    Target,
    TrendingUp,
    Award,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn, API_BASE } from "@/lib/utils";
import { saveRiskProfile } from "@/hooks/useFinancialData";

// ─── Quiz Data ──────────────────────────────────────────────────────────────

const questions = [
    {
        id: "q1",
        question: "What is your primary financial goal for the next 12 months?",
        options: [
            "Build an emergency fund",
            "Pay off existing debt",
            "Start investing",
            "Save for a major purchase",
            "Grow existing investments aggressively",
        ],
    },
    {
        id: "q2",
        question: "How would you react if your investment lost 20% in a month?",
        options: [
            "Sell everything immediately",
            "Sell some to reduce exposure",
            "Hold and wait for recovery",
            "Buy more at the lower price",
        ],
    },
    {
        id: "q3",
        question: "How many months of expenses do you have saved?",
        options: [
            "Less than 1 month",
            "1-3 months",
            "3-6 months",
            "More than 6 months",
        ],
    },
    {
        id: "q4",
        question: "What percentage of your income do you save monthly?",
        options: ["0-5%", "5-15%", "15-30%", "More than 30%"],
    },
    {
        id: "q5",
        question:
            "How comfortable are you with financial products (stocks, bonds, crypto)?",
        options: [
            "Not comfortable at all",
            "Basic understanding",
            "Intermediate — I invest regularly",
            "Expert — I actively manage a portfolio",
        ],
    },
];

// ─── Result View ────────────────────────────────────────────────────────────

function ResultCard({
    result,
}: {
    result: {
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
    };
}) {
    const circumference = 2 * Math.PI * 55;
    const progress = (result.health_score / 100) * circumference;
    const color =
        result.health_score >= 75
            ? "#34d399"
            : result.health_score >= 50
                ? "#fbbf24"
                : "#f87171";

    const breakdownItems = [
        { label: "Savings Ratio", value: result.breakdown.savings_ratio, icon: Target },
        { label: "Debt Mgmt", value: result.breakdown.debt_management, icon: Shield },
        { label: "Emergency Fund", value: result.breakdown.emergency_fund, icon: Award },
        { label: "Investment Mix", value: result.breakdown.investment_diversity, icon: TrendingUp },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg mx-auto space-y-6"
        >
            {/* Score Circle */}
            <div className="card p-8 text-center">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
                    Your Financial Health Score
                </h2>
                <div className="relative w-36 h-36 mx-auto mb-6">
                    <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                        <circle cx="65" cy="65" r="55" fill="none" stroke="var(--color-border)" strokeWidth="8" />
                        <motion.circle
                            cx="65" cy="65" r="55" fill="none" stroke={color} strokeWidth="8"
                            strokeLinecap="round" strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - progress }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                            style={{ filter: `drop-shadow(0 0 10px ${color}60)` }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-4xl font-bold" style={{ color }}
                        >
                            {result.health_score}
                        </motion.span>
                        <span className="text-xs text-[var(--color-text-muted)]">out of 100</span>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    Risk Profile: {result.risk_category}
                </div>
            </div>

            {/* Breakdown */}
            <div className="card p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                    Score Breakdown
                </h3>
                <div className="space-y-4">
                    {breakdownItems.map((item) => (
                        <div key={item.label}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                                    <item.icon className="w-3.5 h-3.5 text-emerald-400" />
                                    {item.label}
                                </div>
                                <span className="text-xs text-[var(--color-text-muted)]">{item.value}/100</span>
                            </div>
                            <div className="h-2 rounded-full bg-[var(--color-bg-primary)] overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.value}%` }}
                                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recommendations */}
            <div className="card p-6">
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                    Recommendations
                </h3>
                <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + i * 0.1 }}
                            className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]"
                        >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            {rec}
                        </motion.div>
                    ))}
                </div>
            </div>

            <button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25"
            >
                Go to Dashboard →
            </button>
        </motion.div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSelect = (optionIndex: number) => {
        setAnswers((prev) => ({
            ...prev,
            [questions[currentQ].id]: optionIndex,
        }));
    };

    const submitQuiz = async () => {
        setLoading(true);
        const payload = {
            answers: Object.entries(answers).map(([qId, opt]) => ({
                question_id: qId,
                selected_option: opt,
            })),
        };

        try {
            const res = await fetch(`${API_BASE}/api/profile/submit-quiz`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            saveRiskProfile(data); // Persist for AI Advisor system prompt
            setResult(data);
        } catch {
            // Fallback: calculate locally
            const scores = Object.values(answers);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const fallbackResult = {
                risk_score: Math.round(avg * 20),
                risk_category: avg < 1.5 ? "Conservative" : avg < 2.5 ? "Moderate" : "Aggressive",
                health_score: Math.round(avg * 25),
                breakdown: {
                    savings_ratio: Math.round(avg * 22),
                    debt_management: Math.round(avg * 18),
                    emergency_fund: Math.round(avg * 20),
                    investment_diversity: Math.round(avg * 15),
                },
                recommendations: [
                    "Build your emergency fund to cover 3-6 months of expenses",
                    "Aim to save at least 20% of your monthly income",
                    "Start with low-cost index funds to diversify",
                ],
            };
            saveRiskProfile(fallbackResult); // Persist for AI Advisor
            setResult(fallbackResult);
        }
        setLoading(false);
    };

    const progress = ((currentQ + 1) / questions.length) * 100;

    if (result) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                    <ResultCard result={result} />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 pt-24 pb-12">
                {/* Progress Bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--color-text-muted)]">
                            Question {currentQ + 1} of {questions.length}
                        </span>
                        <span className="text-sm text-emerald-400 font-medium">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-bg-card)] overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQ}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="card p-8"
                    >
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6">
                            {questions[currentQ].question}
                        </h2>

                        <div className="space-y-3">
                            {questions[currentQ].options.map((option, i) => {
                                const selected = answers[questions[currentQ].id] === i;
                                return (
                                    <motion.button
                                        key={i}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => handleSelect(i)}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl border transition-all text-sm",
                                            selected
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                                : "border-[var(--color-border)] bg-[var(--color-bg-primary)]/40 text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                                    selected
                                                        ? "border-emerald-400 bg-emerald-500/20"
                                                        : "border-[var(--color-text-dim)]"
                                                )}
                                            >
                                                {selected && (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                )}
                                            </div>
                                            {option}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                        disabled={currentQ === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {currentQ < questions.length - 1 ? (
                        <button
                            onClick={() => setCurrentQ((q) => q + 1)}
                            disabled={answers[questions[currentQ].id] === undefined}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={submitQuiz}
                            disabled={answers[questions[currentQ].id] === undefined || loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/25"
                        >
                            {loading ? "Calculating..." : "Get My Score"} <CheckCircle2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
