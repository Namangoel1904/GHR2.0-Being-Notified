"use client";

import { useState, useCallback } from "react";
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
import Navbar from "@/components/Navbar";
import { cn, API_BASE } from "@/lib/utils";

// ─── 13 Financial Niti Questions (Indian Context) ───────────────────────────

interface Question {
    id: string;
    question: string;
    options?: string[];
    type: "radio" | "slider";
    sliderMin?: number;
    sliderMax?: number;
    sliderStep?: number;
    sliderUnit?: string;
}

const questions: Question[] = [
    {
        id: "q1",
        question: "What is your age bracket?",
        type: "radio",
        options: ["18-22", "23-27", "28-35", "36-45", "45+"],
    },
    {
        id: "q2",
        question: "What is your approximate monthly income range?",
        type: "radio",
        options: [
            "Below ₹25,000",
            "₹25,000 – ₹50,000",
            "₹50,000 – ₹1,00,000",
            "₹1,00,000 – ₹2,00,000",
            "Above ₹2,00,000",
        ],
    },
    {
        id: "q3",
        question: "What is your approximate monthly expense range (rent, food, commute, recharges)?",
        type: "radio",
        options: [
            "Below ₹15,000",
            "₹15,000 – ₹30,000",
            "₹30,000 – ₹60,000",
            "₹60,000 – ₹1,00,000",
            "Above ₹1,00,000",
        ],
    },
    {
        id: "q4",
        question: "How much do you currently have in savings (bank + FDs + liquid funds)?",
        type: "radio",
        options: [
            "Less than ₹25,000",
            "₹25,000 – ₹1,00,000",
            "₹1,00,000 – ₹5,00,000",
            "₹5,00,000 – ₹15,00,000",
            "Above ₹15,00,000",
        ],
    },
    {
        id: "q5",
        question:
            "Do you have any active debts? (Personal loans, credit card EMIs, education loans)",
        type: "radio",
        options: [
            "No debt at all",
            "Only education loan",
            "Credit card dues (manageable)",
            "Multiple EMIs (personal + credit card)",
            "High-interest debt (>15% APR)",
        ],
    },
    {
        id: "q6",
        question: "What percentage of your monthly income goes towards EMI/loan repayments?",
        type: "radio",
        options: ["0% (no EMIs)", "1-15%", "15-30%", "30-50%", "More than 50%"],
    },
    {
        id: "q7",
        question:
            "How many months of expenses can you cover from emergency reserves? (Include FDs, gold, family support)",
        type: "radio",
        options: [
            "Less than 1 month",
            "1-2 months",
            "3-4 months",
            "5-6 months",
            "More than 6 months",
        ],
    },
    {
        id: "q8",
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
        id: "q9",
        question: "What is your investment experience?",
        type: "radio",
        options: [
            "Never invested",
            "Only fixed deposits / PPF / RD",
            "Mutual funds (SIPs)",
            "Stocks + Mutual funds",
            "Diversified (Stocks, MFs, Crypto, Real Estate)",
        ],
    },
    {
        id: "q10",
        question: "If your investments dropped 25% in one month, what would you do?",
        type: "radio",
        options: [
            "Sell everything immediately — can't handle losses",
            "Sell partial to protect capital",
            "Hold steady and wait for recovery",
            "Buy more — it's a discount opportunity",
        ],
    },
    {
        id: "q11",
        question: "What is your primary financial goal right now?",
        type: "radio",
        options: [
            "Clear all debt / EMIs first",
            "Build an emergency fund",
            "Start investing for wealth creation",
            "Save for a major purchase (car, home, wedding)",
            "Plan for retirement / financial independence",
        ],
    },
    {
        id: "q12",
        question: "What percentage of your income are you willing to commit to savings/investments?",
        type: "slider",
        sliderMin: 0,
        sliderMax: 50,
        sliderStep: 5,
        sliderUnit: "%",
    },
    {
        id: "q13",
        question: "What is your financial goal timeline?",
        type: "radio",
        options: [
            "Immediate (< 6 months)",
            "Short-term (6 months – 2 years)",
            "Medium-term (2 – 5 years)",
            "Long-term (5 – 10 years)",
            "Very long-term (10+ years / retirement)",
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
        low: "border-emerald-500/30 bg-emerald-500/5",
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
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
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
            ? "#34d399"
            : result.health_score >= 50
                ? "#fbbf24"
                : "#f87171";

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
                    className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center"
                >
                    <Brain className="w-7 h-7 text-emerald-400" />
                </motion.div>

                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                    Your Financial Health Score
                </h2>

                {/* Personality Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-6"
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
                            animate={{ strokeDashoffset: circumference - progress }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                            style={{ filter: `drop-shadow(0 0 10px ${color}60)` }}
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
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span className="text-[var(--color-text-muted)]">Risk:</span>
                        <span className="text-emerald-300 font-medium">
                            {result.risk_category}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-[var(--color-text-muted)]">Savings:</span>
                        <span className="text-emerald-300 font-medium">
                            {Math.round(result.savings_ratio * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Insight Cards */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
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
                        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-emerald-300 transition-colors w-full"
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
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
            </motion.button>
        </motion.div>
    );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<Record<string, number | string>>({});
    const [result, setResult] = useState<OnboardingResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState("");

    const q = questions[currentQ];

    const handleSelect = (value: number | string) => {
        setAnswers((prev) => ({ ...prev, [q.id]: value }));
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
            } else if (typeof raw === "number" && question.options) {
                structuredAnswers[question.id] = raw;
                structuredAnswers[`${question.id}_label`] =
                    question.options[raw] || `Option ${raw}`;
            }
        });

        try {
            setAiStatus("🧠 DeepSeek-R1 is analyzing your financial profile...");

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
                // Store profile in localStorage for dashboard
                localStorage.setItem("onboarding_profile", JSON.stringify(data));
                setResult(data);
            } else {
                setAiStatus(`Error: ${data.message}`);
            }
        } catch {
            setAiStatus("⚠️ AI unavailable — using fallback analysis...");
            // Use fallback after a brief delay
            setTimeout(() => {
                const fallback: OnboardingResult = {
                    health_score: 62,
                    personality_badge: "The Balanced Navigator",
                    risk_category: "Moderate",
                    savings_ratio: 0.15,
                    ai_insights: [
                        {
                            title: "Build Your Emergency Fund",
                            description:
                                "Aim for 3-6 months of expenses in liquid funds or FDs. Gold and family support also count.",
                            priority: "high",
                        },
                        {
                            title: "Follow the 50-30-20 Rule",
                            description:
                                "Allocate 50% to needs (rent, EMIs), 30% to wants, 20% to savings. Track with ArthNiti.",
                            priority: "medium",
                        },
                        {
                            title: "Clear High-Interest EMIs",
                            description:
                                "Credit card debt above 15% APR should be cleared before investing — it's the best 'return' you can earn.",
                            priority: "high",
                        },
                    ],
                    ai_reasoning: "Fallback analysis — AI was unreachable.",
                };
                localStorage.setItem("onboarding_profile", JSON.stringify(fallback));
                setResult(fallback);
            }, 1500);
        }
        setLoading(false);
    }, [answers]);

    const progress = ((currentQ + 1) / questions.length) * 100;
    const isAnswered = answers[q?.id] !== undefined;

    // ── Result screen ──
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

    // ── Loading / AI thinking screen ──
    if (loading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="max-w-2xl mx-auto px-4 pt-24 pb-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card p-12 text-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-emerald-500/15 flex items-center justify-center"
                        >
                            <Brain className="w-8 h-8 text-emerald-400" />
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
                                    className="w-2 h-2 rounded-full bg-emerald-400"
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
            <Navbar />
            <main className="max-w-2xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        Financial <span className="text-gradient">Niti</span> Profile
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        Answer 13 questions — AI will build your personalized financial strategy
                    </p>
                </motion.div>

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
                            {q.question}
                        </h2>

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
                        )}

                        {/* Slider for Q12 */}
                        {q.type === "slider" && (
                            <div className="space-y-6 py-4">
                                <div className="text-center">
                                    <span className="text-5xl font-bold text-emerald-400">
                                        {answers[q.id] ??
                                            q.sliderMin ??
                                            0}
                                    </span>
                                    <span className="text-2xl text-[var(--color-text-muted)] ml-1">
                                        {q.sliderUnit}
                                    </span>
                                </div>

                                <input
                                    type="range"
                                    min={q.sliderMin ?? 0}
                                    max={q.sliderMax ?? 100}
                                    step={q.sliderStep ?? 5}
                                    value={
                                        answers[q.id] !== undefined
                                            ? Number(answers[q.id])
                                            : q.sliderMin ?? 0
                                    }
                                    onChange={(e) =>
                                        handleSelect(Number(e.target.value))
                                    }
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--color-bg-primary)] accent-emerald-500"
                                />

                                <div className="flex justify-between text-xs text-[var(--color-text-dim)]">
                                    <span>
                                        {q.sliderMin ?? 0}
                                        {q.sliderUnit}
                                    </span>
                                    <span className="text-emerald-400/60 text-[10px]">
                                        50-30-20 suggests ≥ 20%
                                    </span>
                                    <span>
                                        {q.sliderMax ?? 100}
                                        {q.sliderUnit}
                                    </span>
                                </div>
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
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={submitQuestionnaire}
                            disabled={!isAnswered || loading}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-semibold hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/25"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
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
