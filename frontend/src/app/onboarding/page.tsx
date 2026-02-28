"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    Shield,
    CheckCircle2,
    Target,
    TrendingUp,
    Award,
    Loader2,
    Sparkles,
    Brain,
    ArrowRight,
} from "lucide-react";
import { cn, API_BASE } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Question {
    id: string;
    question: string;
    section: string;
    sectionIcon: string;
    options?: string[];
    type: "radio" | "slider" | "category_input" | "dropdown";
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
    sliderUnit?: string;
    sliderPrefix?: string;
    optional?: boolean;
    helperText?: string;
    categories?: string[];
}

// ─── Section Colors ─────────────────────────────────────────────────────────

const sectionColors: Record<string, string> = {
    "Income & Spending": "from-blue-500 to-blue-600",
    "Savings & Stability": "from-indigo-500 to-indigo-600",
    "Behaviour & Personality": "from-violet-500 to-violet-600",
    Goals: "from-sky-500 to-sky-600",
};

// ─── 13 ArthNiti Questions (New Spec) ───────────────────────────────────────

const questions: Question[] = [
    // ─── SECTION 1: Income & Spending ───
    {
        id: "monthly_income",
        section: "Income & Spending",
        sectionIcon: "📊",
        question: "What is your approximate monthly income?",
        type: "slider",
        sliderMin: 0,
        sliderMax: 500000,
        sliderStep: 1000,
        sliderPrefix: "₹",
    },
    {
        id: "savings_percentage",
        section: "Income & Spending",
        sectionIcon: "📊",
        question: "On average, how much of your income do you save each month?",
        type: "slider",
        sliderMin: 0,
        sliderMax: 100,
        sliderStep: 1,
        sliderUnit: "%",
    },
    {
        id: "category_spending",
        section: "Income & Spending",
        sectionIcon: "📊",
        question: "How much do you spend category-wise per month?",
        type: "category_input",
        categories: [
            "Rent / Housing",
            "Food & Dining",
            "Shopping / Lifestyle",
            "Bills & Utilities",
            "Transportation",
            "Family Expenses",
            "Subscriptions & Entertainment",
        ],
    },
    {
        id: "debt_status",
        section: "Income & Spending",
        sectionIcon: "📊",
        question:
            "Do you currently have any EMIs, loans, or debt obligations?",
        type: "radio",
        options: [
            "No debt",
            "Small & manageable",
            "Moderate debt burden",
            "High debt burden",
            "Prefer not to disclose",
        ],
    },

    // ─── SECTION 2: Savings & Financial Stability ───
    {
        id: "insurance_coverage",
        section: "Savings & Stability",
        sectionIcon: "💰",
        question: "Do you have health & life insurance coverage?",
        type: "radio",
        options: [
            "No insurance at all",
            "Only employer-provided health insurance",
            "Personal health insurance only",
            "Health + Term life insurance",
            "Comprehensive coverage (health + life + critical illness)",
        ],
    },
    {
        id: "emergency_fund",
        section: "Savings & Stability",
        sectionIcon: "💰",
        question: "Do you have an emergency fund?",
        type: "radio",
        options: [
            "No emergency fund",
            "Less than 1 month of expenses",
            "1–3 months",
            "3–6 months",
            "More than 6 months",
        ],
    },
    {
        id: "unexpected_expenses",
        section: "Savings & Stability",
        sectionIcon: "💰",
        question: "How do you handle unexpected expenses?",
        type: "radio",
        options: [
            "Use savings",
            "Reduce other spending",
            "Use credit/borrow",
            "Delay and manage later",
        ],
    },

    // ─── SECTION 3: Behaviour, Budgeting & Personality ───
    {
        id: "budget_habit",
        section: "Behaviour & Personality",
        sectionIcon: "🧠",
        question: "Do you currently follow a monthly budget?",
        type: "radio",
        options: [
            "Yes, strictly",
            "Yes, but loosely",
            "I try but don't track properly",
            "No, I don't budget",
        ],
    },
    {
        id: "financial_style",
        section: "Behaviour & Personality",
        sectionIcon: "🧠",
        question: "Which statement describes your financial style best?",
        type: "radio",
        options: [
            "I prefer saving and avoiding financial risks",
            "I balance spending and saving carefully",
            "I enjoy spending and worry about savings later",
            "I don't actively plan my finances",
        ],
    },
    {
        id: "risk_comfort",
        section: "Behaviour & Personality",
        sectionIcon: "🧠",
        question: "How comfortable are you with financial uncertainty?",
        type: "radio",
        options: [
            "Not comfortable at all",
            "Slightly uncomfortable",
            "Comfortable if planned",
            "Very comfortable",
        ],
    },

    // ─── SECTION 4: Goals ───
    {
        id: "primary_goal",
        section: "Goals",
        sectionIcon: "🎯",
        question: "What is your primary financial goal right now?",
        type: "radio",
        options: [
            "Building an emergency fund",
            "Better budgeting & expense control",
            "Paying off debts/EMIs",
            "Saving for a major goal (car, business, education, etc.)",
            "Improving saving discipline",
            "Just understanding my finances better",
            "Not sure yet",
        ],
    },
    {
        id: "goal_amount",
        section: "Goals",
        sectionIcon: "🎯",
        question: "What is your target goal amount?",
        type: "slider",
        sliderMin: 0,
        sliderMax: 5000000,
        sliderStep: 10000,
        sliderPrefix: "₹",
        optional: true,
        helperText: "Leave at ₹0 if unsure. AI will estimate.",
    },
    {
        id: "goal_timeframe",
        section: "Goals",
        sectionIcon: "🎯",
        question: "What is your expected timeframe to achieve this goal?",
        type: "dropdown",
        options: [
            "Less than 1 year",
            "1–3 years",
            "3–5 years",
            "5+ years",
            "Not sure",
        ],
    },
];

// ─── Insight Card Component ─────────────────────────────────────────────────

function InsightCardUI({
    title,
    description,
    priority,
    delay,
}: {
    title: string;
    description: string;
    priority: string;
    delay: number;
}) {
    const priorityColors: Record<string, string> = {
        high: "border-red-500/30 bg-red-500/5",
        medium: "border-yellow-500/30 bg-yellow-500/5",
        low: "border-blue-500/30 bg-blue-500/5",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className={cn(
                "p-5 rounded-xl border",
                priorityColors[priority] || priorityColors.medium
            )}
        >
            <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-[var(--color-text-primary)] mb-1">
                        {title}
                    </h4>
                    <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Result View ────────────────────────────────────────────────────────────

interface OnboardingResult {
    health_score: number;
    personality_badge: string;
    risk_category: string;
    savings_ratio: number;
    ai_insights: { title: string; description: string; priority: string }[];
    ai_reasoning?: string;
}

function ResultCard({ result }: { result: OnboardingResult }) {
    const circumference = 2 * Math.PI * 55;
    const progress = (result.health_score / 100) * circumference;
    const color =
        result.health_score >= 75
            ? "#3b82f6"
            : result.health_score >= 50
                ? "#f59e0b"
                : "#ef4444";

    const [showReasoning, setShowReasoning] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto space-y-6"
        >
            {/* Score + Badge */}
            <div className="card p-8 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-500/15 flex items-center justify-center"
                >
                    <Brain className="w-7 h-7 text-blue-500" />
                </motion.div>

                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                    Your Financial Health Score
                </h2>

                {/* Personality Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm font-medium mb-6"
                >
                    <Award className="w-4 h-4" />
                    {result.personality_badge}
                </motion.div>

                {/* Score Circle */}
                <div className="relative w-36 h-36 mx-auto mb-4">
                    <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                        <circle
                            cx="65"
                            cy="65"
                            r="55"
                            fill="none"
                            stroke="var(--color-border)"
                            strokeWidth="8"
                        />
                        <motion.circle
                            cx="65"
                            cy="65"
                            r="55"
                            fill="none"
                            stroke={color}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{
                                strokeDashoffset: circumference - progress,
                            }}
                            transition={{
                                duration: 1.5,
                                ease: "easeOut",
                                delay: 0.5,
                            }}
                            style={{
                                filter: `drop-shadow(0 0 10px ${color}60)`,
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.8 }}
                            className="text-4xl font-bold"
                            style={{ color }}
                        >
                            {result.health_score}
                        </motion.span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                            out of 100
                        </span>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="flex items-center justify-center gap-6 text-sm mt-4">
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <span className="text-[var(--color-text-muted)]">
                            Risk:
                        </span>
                        <span className="text-blue-600 font-medium">
                            {result.risk_category}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-blue-500" />
                        <span className="text-[var(--color-text-muted)]">
                            Savings:
                        </span>
                        <span className="text-blue-600 font-medium">
                            {Math.round(result.savings_ratio * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Insight Cards */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    AI-Powered Insights
                </h3>
                {result.ai_insights.map((insight, i) => (
                    <InsightCardUI
                        key={i}
                        title={insight.title}
                        description={insight.description}
                        priority={insight.priority}
                        delay={1.0 + i * 0.15}
                    />
                ))}
            </div>

            {/* AI Reasoning (CoT) */}
            {result.ai_reasoning && (
                <div className="card p-4">
                    <button
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-blue-500 transition-colors w-full"
                    >
                        <Brain className="w-4 h-4" />
                        {showReasoning ? "Hide" : "View"} AI Reasoning
                        <ChevronRight
                            className={cn(
                                "w-4 h-4 ml-auto transition-transform",
                                showReasoning && "rotate-90"
                            )}
                        />
                    </button>
                    <AnimatePresence>
                        {showReasoning && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-3 pt-3 border-t border-[var(--color-border)]"
                            >
                                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap">
                                    {result.ai_reasoning}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Go to Dashboard */}
            <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
            </motion.button>
        </motion.div>
    );
}

// ─── Format helpers ─────────────────────────────────────────────────────────

function formatINR(value: number): string {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number | string | Record<string, number>>>({});
    const [result, setResult] = useState<OnboardingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState("");

    // Gate: if already onboarded, redirect to dashboard (can't redo)
    const [ready, setReady] = useState(false);
    useEffect(() => {
        const existing = localStorage.getItem("onboarding_profile");
        if (existing) {
            window.location.href = "/dashboard";
            return;
        }
        setReady(true);
    }, []);

    const q = questions[currentQ];

    const handleSelect = (value: number | string) => {
        setAnswers((prev) => ({ ...prev, [q.id]: value }));
    };

    const handleCategoryInput = (category: string, value: number) => {
        setAnswers((prev) => {
            const existing = (prev[q.id] as Record<string, number>) || {};
            return { ...prev, [q.id]: { ...existing, [category]: value } };
        });
    };

    const submitQuestionnaire = useCallback(async () => {
        setLoading(true);
        setAiStatus("Sending your profile to AI...");

        const userId = localStorage.getItem("user_id") || "";

        // Build structured answer payload with readable labels
        const structuredAnswers: Record<string, unknown> = {};
        questions.forEach((question) => {
            const raw = answers[question.id];
            if (question.type === "slider") {
                structuredAnswers[question.id] = raw;
            } else if (question.type === "category_input") {
                structuredAnswers[question.id] = raw; // already a Record<string, number>
            } else if (question.type === "dropdown") {
                structuredAnswers[question.id] = raw; // string value
            } else if (typeof raw === "number" && question.options) {
                structuredAnswers[question.id] = raw;
                structuredAnswers[`${question.id}_label`] =
                    question.options[raw] || `Option ${raw}`;
            }
        });

        try {
            setAiStatus(
                "🧠 DeepSeek-R1 is analyzing your financial profile..."
            );

            const res = await fetch(`${API_BASE}/api/onboarding/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    answers: structuredAnswers,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // Store profile and raw answers in localStorage for dashboard
                localStorage.setItem(
                    "onboarding_profile",
                    JSON.stringify(data)
                );
                localStorage.setItem(
                    "questionnaire_answers",
                    JSON.stringify(answers)
                );
                setResult(data);
            } else {
                setAiStatus(`Error: ${data.message}`);
            }
        } catch {
            setAiStatus("⚠️ AI unavailable — using fallback analysis...");
            // Use fallback after a brief delay
            setTimeout(() => {
                const income = (answers["monthly_income"] as number) || 50000;
                const savingsPct = (answers["savings_percentage"] as number) || 10;
                const fallback: OnboardingResult = {
                    health_score: Math.min(100, Math.max(20, Math.round(savingsPct * 2 + 40))),
                    personality_badge: "The Balanced Navigator",
                    risk_category: "Moderate",
                    savings_ratio: savingsPct / 100,
                    ai_insights: [
                        {
                            title: "Build Your Emergency Fund",
                            description: `Based on your ₹${income.toLocaleString("en-IN")} monthly income, aim for 3-6 months of expenses in liquid funds or FDs. Gold and family support also count.`,
                            priority: "high",
                        },
                        {
                            title: "Follow the 50-30-20 Rule",
                            description:
                                "Allocate 50% to needs (rent, EMIs), 30% to wants, 20% to savings. Track with ArthNiti.",
                            priority: "medium",
                        },
                        {
                            title: "Review Your Spending Categories",
                            description:
                                "Your category-wise data shows opportunities to optimize. Focus on reducing discretionary spending first.",
                            priority: "high",
                        },
                    ],
                    ai_reasoning:
                        "Fallback analysis — AI was unreachable.",
                };
                localStorage.setItem(
                    "onboarding_profile",
                    JSON.stringify(fallback)
                );
                localStorage.setItem(
                    "questionnaire_answers",
                    JSON.stringify(answers)
                );
                setResult(fallback);
            }, 1500);
        }
        setLoading(false);
    }, [answers]);

    // Don't render until readiness check passes (placed after ALL hooks)
    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const progress = ((currentQ + 1) / questions.length) * 100;

    // Check if current question is answered
    const isAnswered = (() => {
        if (q.optional) return true; // optional questions always pass
        const val = answers[q.id];
        if (val === undefined) return false;
        if (q.type === "category_input") {
            // At least one category must have a value > 0
            const cats = val as Record<string, number>;
            return Object.values(cats).some((v) => v > 0);
        }
        return true;
    })();

    // Check section change for section header
    const isNewSection = currentQ === 0 || q.section !== questions[currentQ - 1]?.section;

    // ── Result screen ──
    if (result) {
        return (
            <div className="min-h-screen">
                <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                    <ResultCard result={result} />
                </main>
            </div>
        );
    }

    // ── Loading / AI thinking screen ──
    if (loading) {
        return (
            <div className="min-h-screen">
                <main className="max-w-2xl mx-auto px-4 pt-12 pb-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card p-12 text-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "linear",
                            }}
                            className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-500/15 flex items-center justify-center"
                        >
                            <Brain className="w-8 h-8 text-blue-500" />
                        </motion.div>
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                            ArthNiti is Analyzing...
                        </h2>
                        <p className="text-[var(--color-text-muted)] text-sm mb-6">
                            {aiStatus}
                        </p>
                        <div className="flex items-center justify-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1.2,
                                        delay: i * 0.2,
                                    }}
                                    className="w-2 h-2 rounded-full bg-blue-500"
                                />
                            ))}
                        </div>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ── Questionnaire ──
    return (
        <div className="min-h-screen">
            <main className="max-w-2xl mx-auto px-4 pt-12 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        Financial{" "}
                        <span className="text-gradient">Niti</span> Profile
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        Answer 13 questions — AI will build your personalized
                        financial strategy
                    </p>
                </motion.div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--color-text-muted)]">
                            Question {currentQ + 1} of {questions.length}
                        </span>
                        <span className="text-sm text-blue-500 font-medium">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* Section badge */}
                {isNewSection && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4"
                    >
                        <span
                            className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white text-xs font-medium bg-gradient-to-r",
                                sectionColors[q.section] || "from-blue-500 to-blue-600"
                            )}
                        >
                            <span>{q.sectionIcon}</span>
                            {q.section}
                        </span>
                    </motion.div>
                )}

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
                            {q.question}
                        </h2>

                        {q.optional && (
                            <p className="text-xs text-[var(--color-text-dim)] mb-4 italic">
                                {q.helperText || "This question is optional."}
                            </p>
                        )}

                        {/* Radio options */}
                        {q.type === "radio" && q.options && (
                            <div className="space-y-3">
                                {q.options.map((option, i) => {
                                    const selected = answers[q.id] === i;
                                    return (
                                        <motion.button
                                            key={i}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleSelect(i)}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all text-sm",
                                                selected
                                                    ? "border-blue-500/40 bg-blue-50 text-blue-700"
                                                    : "border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                                        selected
                                                            ? "border-blue-500 bg-blue-500/20"
                                                            : "border-[var(--color-text-dim)]"
                                                    )}
                                                >
                                                    {selected && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                                {option}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Dropdown */}
                        {q.type === "dropdown" && q.options && (
                            <div className="space-y-3">
                                {q.options.map((option, i) => {
                                    const selected = answers[q.id] === option;
                                    return (
                                        <motion.button
                                            key={i}
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                            onClick={() => handleSelect(option)}
                                            className={cn(
                                                "w-full text-left p-4 rounded-xl border transition-all text-sm",
                                                selected
                                                    ? "border-blue-500/40 bg-blue-50 text-blue-700"
                                                    : "border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-border-hover)]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                                                        selected
                                                            ? "border-blue-500 bg-blue-500/20"
                                                            : "border-[var(--color-text-dim)]"
                                                    )}
                                                >
                                                    {selected && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                                {option}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Slider */}
                        {q.type === "slider" && (
                            <div className="space-y-6 py-4">
                                <div className="text-center">
                                    <span className="text-4xl font-bold text-blue-600">
                                        {q.sliderPrefix || ""}
                                        {q.sliderPrefix === "₹"
                                            ? (
                                                (answers[q.id] as number) ??
                                                q.sliderMin ??
                                                0
                                            ).toLocaleString("en-IN")
                                            : ((answers[q.id] as number) ??
                                                q.sliderMin ??
                                                0)}
                                    </span>
                                    {q.sliderUnit && (
                                        <span className="text-2xl text-[var(--color-text-muted)] ml-1">
                                            {q.sliderUnit}
                                        </span>
                                    )}
                                </div>

                                <input
                                    type="range"
                                    min={q.sliderMin ?? 0}
                                    max={q.sliderMax ?? 100}
                                    step={q.sliderStep ?? 1}
                                    value={
                                        answers[q.id] !== undefined
                                            ? Number(answers[q.id])
                                            : q.sliderMin ?? 0
                                    }
                                    onChange={(e) =>
                                        handleSelect(Number(e.target.value))
                                    }
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-border)] accent-blue-500"
                                />

                                <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
                                    <span>
                                        {q.sliderPrefix || ""}
                                        {q.sliderMin ?? 0}
                                        {q.sliderUnit || ""}
                                    </span>
                                    {q.id === "savings_percentage" && (
                                        <span className="text-blue-500/60 text-[10px]">
                                            50-30-20 suggests ≥ 20%
                                        </span>
                                    )}
                                    <span>
                                        {q.sliderPrefix || ""}
                                        {q.sliderPrefix === "₹"
                                            ? (q.sliderMax ?? 0).toLocaleString("en-IN")
                                            : (q.sliderMax ?? 100)}
                                        {q.sliderUnit || ""}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Category Input (fill-in-the-blank) */}
                        {q.type === "category_input" && q.categories && (
                            <div className="space-y-3">
                                {q.categories.map((cat) => {
                                    const catAnswers =
                                        (answers[q.id] as Record<string, number>) || {};
                                    return (
                                        <div
                                            key={cat}
                                            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-white"
                                        >
                                            <span className="text-sm text-[var(--color-text-secondary)] flex-1 min-w-0">
                                                {cat}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <span className="text-sm text-[var(--color-text-muted)]">
                                                    ₹
                                                </span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    placeholder="0"
                                                    value={catAnswers[cat] || ""}
                                                    onChange={(e) =>
                                                        handleCategoryInput(
                                                            cat,
                                                            Number(e.target.value) || 0
                                                        )
                                                    }
                                                    className="w-24 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] text-sm text-right focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 transition-all"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-[var(--color-text-dim)] mt-2">
                                    💡 Enter approximate monthly amounts. Leave 0 for categories that don&apos;t apply.
                                </p>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={() => setCurrentQ((i) => Math.max(0, i - 1))}
                        disabled={currentQ === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {currentQ < questions.length - 1 ? (
                        <button
                            onClick={() => setCurrentQ((i) => i + 1)}
                            disabled={!isAnswered}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-30 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={submitQuestionnaire}
                            disabled={!isAnswered || loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-blue-400 disabled:opacity-30 transition-all shadow-lg shadow-blue-500/25"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />{" "}
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    Get My Score{" "}
                                    <CheckCircle2 className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
