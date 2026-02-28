"use client";

import { motion } from "framer-motion";
import {
    Wallet,
    PiggyBank,
    Shield,
    Target,
    BookOpen,
    Brain,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    TrendingUp,
    LineChart,
    Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// ─── Services Data ──────────────────────────────────────────────────────────

const services = [
    {
        title: "Budget Optimization",
        description: "AI-powered 50-30-20 analysis with personalized reallocation suggestions based on your Indian lifestyle and EMI commitments.",
        icon: Wallet,
        color: "#3b82f6",
        features: ["50-30-20 Rule Analysis", "EMI-aware budgeting", "Smart cut suggestions", "Monthly rebalancing"],
    },
    {
        title: "Savings Planning",
        description: "Build a robust savings strategy with emergency fund calculators, SIP recommendations, and compound interest projections.",
        icon: PiggyBank,
        color: "#06b6d4",
        features: ["Emergency fund planning", "SIP recommendations", "FD vs Liquid fund comparison", "Savings streak tracking"],
    },
    {
        title: "Financial Risk Analysis",
        description: "Comprehensive risk profiling with insurance gap detection, debt-to-income monitoring, and vulnerability assessment.",
        icon: Shield,
        color: "#f97316",
        features: ["Risk profiling quiz", "Insurance coverage check", "Debt vulnerability score", "Market crash simulation"],
    },
    {
        title: "Goal Planning Assistance",
        description: "AI-driven feasibility analysis for your financial dreams — cars, homes, education, retirement — with timeline projections.",
        icon: Target,
        color: "#a855f7",
        features: ["Goal feasibility scoring", "Timeline adjustment", "Multi-goal balancing", "Monthly SIP calculator"],
    },
    {
        title: "Financial Literacy Coaching",
        description: "Behavior-based education that adapts to your profile. From budgeting basics to advanced investment strategies.",
        icon: BookOpen,
        color: "#ec4899",
        features: ["Personalized learning path", "Context-aware tips", "Financial glossary", "Daily insight cards"],
    },
    {
        title: "AI Financial Copilot",
        description: "Ask any financial question and get explainable, personalized answers powered by DeepSeek-R1 with chain-of-thought reasoning.",
        icon: Brain,
        color: "#06b6d4",
        features: ["Natural language queries", "Explainable AI (XAI)", "Personalized insights", "Investment Q&A"],
    },
];

const stats = [
    { label: "Users Analyzed", value: "2,400+", icon: Users },
    { label: "Insights Generated", value: "18,000+", icon: Sparkles },
    { label: "Avg. Savings Boost", value: "23%", icon: TrendingUp },
    { label: "Scenarios Simulated", value: "5,200+", icon: LineChart },
];

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ServicesPage() {
    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 pt-24 pb-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
                        AI Financial <span className="text-gradient">Guidance</span> Services
                    </h1>
                    <p className="text-[var(--color-text-muted)] mt-2 text-sm max-w-2xl mx-auto">
                        Comprehensive, privacy-first financial intelligence powered by on-device DeepSeek-R1.
                        Your data never leaves your machine.
                    </p>
                </motion.div>

                {/* Stats Bar */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
                >
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={stat.label}
                                variants={itemVariants}
                                className="card p-5 text-center"
                            >
                                <Icon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                <p className="text-2xl font-bold text-[var(--color-text-primary)]">{stat.value}</p>
                                <p className="text-xs text-[var(--color-text-dim)]">{stat.label}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Service Cards */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {services.map((service) => {
                        const Icon = service.icon;
                        return (
                            <motion.div
                                key={service.title}
                                variants={itemVariants}
                                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                className="card p-6 hover:border-blue-500/20 transition-all cursor-pointer group"
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                    style={{ backgroundColor: `${service.color}15` }}
                                >
                                    <Icon className="w-6 h-6" style={{ color: service.color }} />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                                    {service.title}
                                </h3>
                                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-4">
                                    {service.description}
                                </p>
                                <ul className="space-y-2 mb-5">
                                    {service.features.map((f) => (
                                        <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex items-center gap-1 text-sm text-blue-400 font-medium group-hover:gap-2 transition-all">
                                    Explore <ArrowRight className="w-4 h-4" />
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-12 card p-8 text-center"
                >
                    <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                        All Services Powered by On-Device AI
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-lg mx-auto mb-5">
                        ArthNiti uses DeepSeek-R1 running locally on your machine via Ollama.
                        Zero cloud dependency. Complete financial privacy. No data ever leaves your device.
                    </p>
                    <button
                        onClick={() => (window.location.href = "/dashboard")}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25"
                    >
                        Go to Dashboard
                    </button>
                </motion.div>
            </main>
        </div>
    );
}
