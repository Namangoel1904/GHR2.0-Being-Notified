"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    Clock,
    ChevronRight,
    PiggyBank,
    Wallet,
    TrendingUp,
    CreditCard,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

const topics = [
    {
        id: "budgeting-101",
        title: "Budgeting 101: The 50/30/20 Rule",
        summary:
            "Learn the simplest and most effective budgeting framework used worldwide.",
        difficulty: "beginner",
        category: "Budgeting",
        readTime: 5,
        icon: Wallet,
        content:
            "The 50/30/20 rule divides your after-tax income into three categories:\n\n**50% — Needs:** Rent, groceries, insurance, minimum debt payments.\n**30% — Wants:** Dining out, entertainment, subscriptions, hobbies.\n**20% — Savings & Debt:** Emergency fund, investments, extra debt payments.\n\nThis framework works because it's simple enough to follow without spreadsheets, yet structured enough to build real financial discipline.",
    },
    {
        id: "emergency-fund",
        title: "Why You Need an Emergency Fund",
        summary:
            "An emergency fund is the foundation of financial security.",
        difficulty: "beginner",
        category: "Savings",
        readTime: 4,
        icon: PiggyBank,
        content:
            "An emergency fund covers 3-6 months of essential expenses. Start with ₹25,000 as a mini goal, then build to one month's expenses. Keep it in a high-yield savings account — accessible but separate from daily spending.",
    },
    {
        id: "compound-interest",
        title: "The Magic of Compound Interest",
        summary:
            "Understanding how your money grows exponentially over time.",
        difficulty: "intermediate",
        category: "Investing",
        readTime: 6,
        icon: TrendingUp,
        content:
            "Compound interest means earning interest on your interest. If you invest ₹10,000 at 8% annual return:\n- Year 1: ₹10,800\n- Year 10: ₹21,589\n- Year 30: ₹1,00,627\n\nThe key insight: time in the market beats timing the market. Starting early, even with small amounts, dramatically outperforms starting late with large sums.",
    },
    {
        id: "debt-avalanche",
        title: "Debt Avalanche vs Debt Snowball",
        summary:
            "Two proven strategies to eliminate debt systematically.",
        difficulty: "intermediate",
        category: "Debt Management",
        readTime: 7,
        icon: CreditCard,
        content:
            "**Avalanche (Math-Optimal):** Pay minimums on all debts, throw extra money at the highest interest rate debt first. Saves the most money.\n\n**Snowball (Psychology-Optimal):** Pay off smallest balance first for quick wins. The motivation boost helps people stick with the plan.\n\nBoth work. Choose the one that matches your personality.",
    },
];

const difficultyColors: Record<string, string> = {
    beginner: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    intermediate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    advanced: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function LiteracyPage() {
    const [expanded, setExpanded] = useState<string | null>(null);

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
                            Financial <span className="text-gradient">Literacy Hub</span>
                        </h1>
                    </div>
                    <p className="text-[var(--color-text-muted)]">
                        Master the fundamentals of personal finance — one topic at a time
                    </p>
                </motion.div>

                {/* Topics Grid */}
                <div className="space-y-4">
                    {topics.map((topic, i) => {
                        const isOpen = expanded === topic.id;
                        const Icon = topic.icon;

                        return (
                            <motion.div
                                key={topic.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="card overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpanded(isOpen ? null : topic.id)}
                                    className="w-full p-6 text-left flex items-start gap-4"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        <Icon className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                                                {topic.title}
                                            </h3>
                                            <span
                                                className={cn(
                                                    "px-2 py-0.5 rounded-full text-xs font-medium border",
                                                    difficultyColors[topic.difficulty]
                                                )}
                                            >
                                                {topic.difficulty}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--color-text-muted)]">
                                            {topic.summary}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-dim)]">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {topic.readTime} min read
                                            </span>
                                            <span>{topic.category}</span>
                                        </div>
                                    </div>
                                    <ChevronRight
                                        className={cn(
                                            "w-5 h-5 text-[var(--color-text-dim)] transition-transform flex-shrink-0 mt-1",
                                            isOpen && "rotate-90"
                                        )}
                                    />
                                </button>

                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 pt-0 pl-[5.75rem]">
                                                <div className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-line border-t border-[var(--color-border)] pt-4">
                                                    {topic.content}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
