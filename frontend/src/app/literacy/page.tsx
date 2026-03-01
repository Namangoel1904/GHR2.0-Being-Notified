"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen,
    PlayCircle,
    ShieldCheck,
    TrendingUp,
    AlertTriangle,
    ChevronRight,
    PiggyBank,
    Landmark,
    Coins,
    Building2,
    Briefcase,
    Gem,
    LineChart,
    Bitcoin,
    Home,
    Video,
    GraduationCap,
    X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

// ─── Data Structures ────────────────────────────────────────────────────────

type RiskLevel = "Safe" | "Moderate" | "High" | "Extremely High";

interface Instrument {
    id: string;
    name: string;
    risk: RiskLevel;
    points: string[];
    bestFor: string;
    icon: any;
    laymanExplanation: string;
}

const instruments: Instrument[] = [
    {
        id: "savings-account",
        name: "Savings Account",
        risk: "Safe",
        points: ["Your regular bank account.", "Deposit and withdraw money anytime.", "Gives very low interest.", "Highly liquid."],
        bestFor: "Emergency money and daily transactions.",
        icon: PiggyBank,
        laymanExplanation: "Think of this as a digital wallet where your money sleeps safely. It won't grow much, but it's always ready when you need to buy groceries or pay a bill."
    },
    {
        id: "fixed-deposit",
        name: "Fixed Deposit (FD)",
        risk: "Safe",
        points: ["Deposit money for a fixed time (1 yr, 3 yrs, etc).", "Bank gives fixed, predictable interest.", "Money is locked for the period."],
        bestFor: "Safe and predictable returns.",
        icon: Landmark,
        laymanExplanation: "You lock your money inside a bank vault for a specific time. In return for leaving it alone, the bank pays you a guaranteed, steady reward."
    },
    {
        id: "recurring-deposit",
        name: "Recurring Deposit (RD)",
        risk: "Safe",
        points: ["Deposit a fixed amount every month.", "Fixed interest rate mapping an FD.", "Helps build a strict savings habit."],
        bestFor: "Small monthly savings.",
        icon: Briefcase,
        laymanExplanation: "Like a piggy bank you're forced to feed every month. It builds discipline and adds a bit of interest, making it great for saving up for a phone or a trip."
    },
    {
        id: "ppf",
        name: "Public Provident Fund (PPF)",
        risk: "Safe",
        points: ["Long-term savings scheme backed by the government.", "Requires a 15-year lock-in period.", "Excellent tax benefits under 80C."],
        bestFor: "Long-term safe savings & retirement.",
        icon: ShieldCheck,
        laymanExplanation: "A super-safe government vault for your retirement. You lock the money away for 15 years, and in return, you get completely tax-free guaranteed growth."
    },
    {
        id: "bonds",
        name: "Bonds",
        risk: "Moderate",
        points: ["Lending money to a company or government.", "You earn fixed interest payouts over time.", "Usually safer than stocks."],
        bestFor: "Medium-term predictable income.",
        icon: Building2,
        laymanExplanation: "You act like the bank! You lend your money to a big company or the government, and they promise to pay you regular interest until they return your original cash."
    },
    {
        id: "debt-mutual-funds",
        name: "Debt Mutual Funds",
        risk: "Moderate",
        points: ["Funds that invest in bonds and fixed-income.", "Moderate returns with higher liquidity than FDs.", "Lower risk than stock market, but not completely risk-free."],
        bestFor: "Medium-term goals.",
        icon: Coins,
        laymanExplanation: "A basket of safe loans. Experts take your money and lend it to reliable companies. It grows faster than a bank deposit but stays much safer than the stock market."
    },
    {
        id: "gold",
        name: "Gold (Physical/Digital)",
        risk: "Moderate",
        points: ["Physical coins, jewelry, or Digital Gold (SGBs).", "Protects purchasing power against inflation.", "Prices fluctuate based on global demand."],
        bestFor: "Diversification and long-term holding.",
        icon: Gem,
        laymanExplanation: "The traditional safety net. It doesn't pay regular interest, but it protects the value of your money over decades when the prices of everyday goods skyrocket."
    },
    {
        id: "equity-mutual-funds",
        name: "Equity Mutual Funds",
        risk: "High",
        points: ["Funds that invest directly in stock markets.", "Higher return potential but value changes daily.", "Professionally managed by fund managers."],
        bestFor: "Wealth creation over time (5+ years).",
        icon: TrendingUp,
        laymanExplanation: "A basket of different company shares managed by an expert. You own a tiny slice of many businesses, so if the stock market grows, your money grows with it."
    },
    {
        id: "etfs",
        name: "Exchange Traded Funds (ETFs)",
        risk: "High",
        points: ["Similar to mutual funds but traded actively like stocks.", "Market-linked and highly diversified.", "Low expense ratios compared to mutual funds."],
        bestFor: "Investors who want flexibility and low fees.",
        icon: LineChart,
        laymanExplanation: "Very similar to Equity Mutual Funds, but traded instantly like normal shares. They simply follow the overall market with very low maintenance fees."
    },
    {
        id: "direct-stocks",
        name: "Direct Stocks (Shares)",
        risk: "High",
        points: ["You buy direct ownership via shares in a company.", "Highest return potential but very volatile.", "Requires deep fundamental knowledge and monitoring."],
        bestFor: "Experienced, active investors.",
        icon: TrendingUp,
        laymanExplanation: "You buy a literal piece of a company (like Apple or Tata). If the company does well, you get richer. If it fails, you lose your money. High risk, high reward."
    },
    {
        id: "crypto",
        name: "Crypto Assets",
        risk: "Extremely High",
        points: ["Digital decentralized assets like Bitcoin.", "Extremely volatile price swings.", "Severe regulatory uncertainty in many regions."],
        bestFor: "High-risk investors only (money you can afford to lose).",
        icon: Bitcoin,
        laymanExplanation: "Highly experimental digital money that lives on the internet. It can make you wealthy overnight or crash to zero. Only put in what you are completely okay with losing."
    },
    {
        id: "real-estate",
        name: "Real Estate (Property)",
        risk: "Moderate",
        points: ["Buying property like apartments, land, or commercial spaces.", "Earn through capital value appreciation.", "Cash flow generation via rental yield."],
        bestFor: "Tangible asset creation and passive rental income.",
        icon: Home,
        laymanExplanation: "Buying actual physical properties. You can live in it, rent it out for a monthly salary, or wait 10 years and sell it for a bigger profit. Requires a huge starting amount."
    }
];

const riskColors: Record<RiskLevel, string> = {
    "Safe": "bg-green-500/10 text-green-400 border-green-500/20",
    "Moderate": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "High": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "Extremely High": "bg-red-500/10 text-red-400 border-red-500/20"
};

interface Course {
    id: string;
    title: string;
    points: { subtitle?: string; lines: string[] }[];
    videoUrl: string;
}

const courses: Course[] = [
    {
        id: "health-score",
        title: "1. What Is a Financial Health Score and Why Should You Care?",
        videoUrl: "https://www.youtube-nocookie.com/embed/WiH2T933xn8",
        points: [
            {
                lines: [
                    "A Financial Health Score is a number showing how stable your money situation is.",
                    "It looks at earning, spending, saving, and emergency preparedness."
                ]
            },
            {
                subtitle: "High Score Means:",
                lines: ["You are financially stable.", "You save regularly.", "You can handle unexpected expenses."]
            },
            {
                subtitle: "Low Score Means:",
                lines: ["You may be overspending.", "You lack sufficient savings.", "You are financially stressed."]
            }
        ]
    },
    {
        id: "start-saving",
        title: "2. How to Start Saving Money (Even If Your Income Is Small)",
        videoUrl: "https://www.youtube-nocookie.com/embed/VeD5uAHf30A",
        points: [
            {
                lines: [
                    "You don’t need a big income to start saving.",
                    "Consistency is much more important than the exact amount."
                ]
            },
            {
                subtitle: "Start Small:",
                lines: [
                    "Save 5–10% of your income first.",
                    "Avoid unnecessary lifestyle spending.",
                    "Automate your savings directly from your paycheck.",
                    "Increase the savings percentage slowly over time."
                ]
            }
        ]
    },
    {
        id: "track-spending",
        title: "3. Where Does My Money Go? Understanding Spending",
        videoUrl: "https://www.youtube-nocookie.com/embed/KCMtwBT4wj0",
        points: [
            {
                lines: [
                    "Most people don’t realize how microscopic daily expenses add up into huge leaks.",
                    "Awareness is always the first step to financial control."
                ]
            },
            {
                subtitle: "How to fix it:",
                lines: [
                    "Track literally every expense for 30 consecutive days.",
                    "Check your bank statements thoroughly.",
                    "Identify your absolute biggest spending categories.",
                    "Focus on reducing pure waste, not your essential needs."
                ]
            }
        ]
    },
    {
        id: "emergency-fund",
        title: "4. Why An Emergency Fund Saves You From Stress",
        videoUrl: "https://www.youtube-nocookie.com/embed/nj1sjbSGoH0",
        points: [
            {
                lines: [
                    "An emergency fund is strictly money mapped aside for the unexpected: Job loss, Medical emergencies, Sudden massive expenses."
                ]
            },
            {
                subtitle: "The Goal:",
                lines: [
                    "Aim for 3 to 6 months of your bare-minimum living expenses.",
                    "It buys you absolute peace of mind.",
                    "It acts as financial safety scaffolding.",
                    "It provides pure confidence during tough times instead of panic."
                ]
            }
        ]
    },
    {
        id: "fd-mf-gold",
        title: "5. Fixed Deposit vs Mutual Fund vs Gold",
        videoUrl: "https://www.youtube-nocookie.com/embed/_Zk31GLXFUs",
        points: [
            {
                subtitle: "Fixed Deposit (FD):",
                lines: ["Safe, fixed return guarantees.", "Extremely low risk."]
            },
            {
                subtitle: "Mutual Funds:",
                lines: ["Invests in the broader stock market.", "Significantly higher return potential, but inherently higher risk."]
            },
            {
                subtitle: "Gold:",
                lines: ["Protects buying power against systemic inflation.", "Medium volatility/risk."]
            }
        ]
    },
    {
        id: "how-much-save",
        title: "6. How Much Should You Actually Save Every Month?",
        videoUrl: "https://www.youtube-nocookie.com/embed/rAYB4RpqHQA",
        points: [
            {
                lines: [
                    "There is no single 'perfect' number, but general guidelines exist."
                ]
            },
            {
                subtitle: "General Benchmarks:",
                lines: [
                    "Absolute Minimum: 10% of your income.",
                    "Ideal Range: 20–30% (if your income supports it)."
                ]
            },
            {
                subtitle: "If income is low:",
                lines: [
                    "Start with literally any amount.",
                    "Increase it gradually as income scales.",
                    "Ensure savings are regular, automated, and mapped to specific goals."
                ]
            }
        ]
    },
    {
        id: "lost-job",
        title: "7. What Happens If You Lose Your Job? Staying Safe",
        videoUrl: "https://www.youtube-nocookie.com/embed/htq7Z9f-W2I",
        points: [
            {
                lines: ["Planning heavily in advance heavily reduces the physiological panic of sudden income loss."]
            },
            {
                subtitle: "If your income stops suddenly:",
                lines: [
                    "Deploy the emergency fund immediately.",
                    "Slash non-essential lifestyle expenses the same day.",
                    "Aggressively avoid taking on new high-interest loans/credit.",
                    "Pivot immediately to finding short-term gig/freelance income to float."
                ]
            }
        ]
    },
    {
        id: "money-mistakes",
        title: "8. Common Money Mistakes Ruining Your Savings",
        videoUrl: "https://www.youtube-nocookie.com/embed/6Tqf0x-ludM",
        points: [
            {
                lines: ["Small miscalculations repeated daily/monthly compound into catastrophic losses yearly."]
            },
            {
                subtitle: "The classic mistakes:",
                lines: [
                    "Not tracking where your cash flows.",
                    "Overspending drastically on lifestyle inflation.",
                    "Using credit/EMIs totally unnecessarily for depreciating liabilities.",
                    "Ignoring small daily 'leak' expenses (like expensive coffees).",
                    "Failing to plan for a 10+ year time horizon."
                ]
            }
        ]
    },
    {
        id: "reducing-expenses",
        title: "9. How to Reduce Expenses Without Feeling Trapped",
        videoUrl: "https://www.youtube-nocookie.com/embed/Qz7B1XpZ73M",
        points: [
            {
                lines: [
                    "You don’t need to stop enjoying your life to be financially responsible.",
                    "Smart deliberate spending is infinitely better than strict suffocating restriction."
                ]
            },
            {
                subtitle: "Actionable Steps:",
                lines: [
                    "Cut pure systemic waste, not things that bring you deep happiness.",
                    "Audit and purge unused subscriptions heavily.",
                    "Instigate price comparison rules before buying.",
                    "Cook more at home as replacing dining out is huge.",
                    "Enforce a '30-day waiting rule' on large impulse purchases."
                ]
            }
        ]
    },
    {
        id: "ai-finance",
        title: "10. How AI Can Supercharge Your Financial Future",
        videoUrl: "https://www.youtube-nocookie.com/embed/G-N57s6c66s",
        points: [
            {
                lines: ["AI acts as a tireless, ultra-rational calculator that works 24/7 for you."]
            },
            {
                subtitle: "How systems like ArthNiti help:",
                lines: [
                    "Categorize and track vast spreadsheets of spending automatically.",
                    "Predict upcoming cash flow crunches before they happen.",
                    "Map out dynamic savings improvement strategies.",
                    "Actively alert you of financial anomalies or risks in real-time.",
                    "Run massively complex 'what-if' simulation scenarios instantly."
                ]
            }
        ]
    }
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LiteracyPage() {
    const [activeTab, setActiveTab] = useState<"instruments" | "courses">("instruments");
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);

    return (
        <div className="min-h-screen">
            <Navbar />
            <main className="max-w-5xl mx-auto px-4 pt-24 pb-20">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-10 max-w-2xl mx-auto"
                >
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-500/10 mb-4">
                        <GraduationCap className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3">
                        Financial <span className="text-gradient">Literacy Academy</span>
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-sm md:text-base leading-relaxed">
                        Master the fundamentals of wealth creation. Choose between exploring standard
                        financial instruments or watching deep-dive masterclasses.
                    </p>
                </motion.div>

                {/* Tab Switcher */}
                <div className="flex bg-[var(--color-bg-elevated)] p-1.5 rounded-2xl max-w-sm mx-auto mb-10 border border-[var(--color-border)]">
                    <button
                        onClick={() => setActiveTab("instruments")}
                        className={cn(
                            "flex-1 py-2.5 text-sm font-medium rounded-xl transition-all",
                            activeTab === "instruments"
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        )}
                    >
                        Financial Instruments
                    </button>
                    <button
                        onClick={() => setActiveTab("courses")}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all",
                            activeTab === "courses"
                                ? "bg-red-600 text-white shadow-lg shadow-red-500/20"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        )}
                    >
                        <PlayCircle className="w-4 h-4" /> Video Masterclasses
                    </button>
                </div>

                {/* TAB CONTENT: Financial Instruments */}
                {activeTab === "instruments" && (
                    <motion.div
                        key="instruments"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Summary Bar */}
                        <div className="pl-4 pr-10 py-5 bg-gradient-to-r from-[var(--color-bg-primary)] to-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-2xl mb-8 flex items-center overflow-x-auto no-scrollbar shadow-sm">
                            <div className="flex items-center whitespace-nowrap">
                                <span className="text-xs font-bold text-[var(--color-text-dim)] uppercase tracking-widest mr-4 ml-2">Risk Scale:</span>
                                <span className="text-green-400 font-semibold text-sm">Safe</span>
                                <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)] mx-1" />
                                <span className="text-yellow-400 font-semibold text-sm">Moderate</span>
                                <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)] mx-1" />
                                <span className="text-orange-400 font-semibold text-sm">High</span>
                                <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)] mx-1" />
                                <span className="text-red-400 font-semibold text-sm">Extremely High</span>
                            </div>
                        </div>

                        {/* Instruments Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {instruments.map((inst, i) => {
                                const Icon = inst.icon;
                                return (
                                    <motion.div
                                        key={inst.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => setSelectedInstrument(inst)}
                                        className="card p-5 group hover:border-[var(--color-border-hover)] cursor-pointer transition-all flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-primary)] flex items-center justify-center border border-[var(--color-border)] group-hover:scale-110 transition-transform">
                                                <Icon className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border", riskColors[inst.risk])}>
                                                {inst.risk}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">{inst.name}</h3>
                                        <ul className="text-sm text-[var(--color-text-muted)] space-y-2 flex-grow mb-5">
                                            {inst.points.map((pt, idx) => (
                                                <li key={idx} className="flex items-start gap-2">
                                                    <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                                                    <span className="leading-relaxed">{pt}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="pt-4 border-t border-[var(--color-border)] mt-auto">
                                            <p className="text-xs font-medium text-[var(--color-text-dim)] mb-1 uppercase tracking-wide">Best For</p>
                                            <p className="text-sm text-blue-300 font-medium">{inst.bestFor}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* TAB CONTENT: Video Courses */}
                {activeTab === "courses" && (
                    <motion.div
                        key="courses"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-3xl mx-auto space-y-4"
                    >
                        {courses.map((course, i) => {
                            const isOpen = expandedCourse === course.id;

                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={cn("card overflow-hidden transition-all duration-300", isOpen ? "border-red-500/30 shadow-lg shadow-red-500/5" : "")}
                                >
                                    <button
                                        onClick={() => setExpandedCourse(isOpen ? null : course.id)}
                                        className="w-full p-6 text-left flex items-start justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-red-500/20 transition-colors">
                                                <Video className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div>
                                                <h3 className={cn("text-base md:text-lg font-bold transition-colors", isOpen ? "text-red-400" : "text-[var(--color-text-primary)]")}>
                                                    {course.title}
                                                </h3>
                                                <p className="text-xs text-[var(--color-text-dim)] mt-1 flex items-center gap-1.5">
                                                    <PlayCircle className="w-3 h-3" /> YouTube Masterclass
                                                </p>
                                            </div>
                                        </div>
                                        <div className={cn("p-2 rounded-full bg-[var(--color-bg-primary)] transition-transform flex-shrink-0", isOpen && "rotate-180")}>
                                            <ChevronRight className="w-4 h-4 text-[var(--color-text-dim)]" />
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                            >
                                                <div className="px-6 pb-6 pt-2">
                                                    {/* Video Embed */}
                                                    <div className="relative w-full rounded-xl overflow-hidden mb-6 bg-black flex aspect-auto" style={{ paddingBottom: '56.25%' }}>
                                                        <iframe
                                                            src={course.videoUrl}
                                                            className="absolute top-0 left-0 w-full h-full border-0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                        />
                                                    </div>

                                                    {/* Course Notes */}
                                                    <div className="bg-[var(--color-bg-primary)] p-5 rounded-2xl border border-[var(--color-border)]">
                                                        <h4 className="text-sm font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                                                            <BookOpen className="w-4 h-4 text-blue-400" /> Key Takeaways
                                                        </h4>

                                                        <div className="space-y-4">
                                                            {course.points.map((pt, pIdx) => (
                                                                <div key={pIdx}>
                                                                    {pt.subtitle && <p className="text-sm font-semibold text-blue-300 mb-2">{pt.subtitle}</p>}
                                                                    <ul className="space-y-2">
                                                                        {pt.lines.map((line, lIdx) => (
                                                                            <li key={lIdx} className="text-sm text-[var(--color-text-muted)] flex items-start gap-2 leading-relaxed">
                                                                                <span className="text-[var(--color-text-dim)] mt-1 text-xs">▹</span>
                                                                                {line}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </main>

            {/* Modal for Layered Layman Explanations */}
            <AnimatePresence>
                {selectedInstrument && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedInstrument(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] p-6 md:p-8 rounded-2xl max-w-lg w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Decorative Grid Background */}
                            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

                            <button
                                onClick={() => setSelectedInstrument(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-[var(--color-bg-elevated)] hover:bg-[var(--color-border)] transition-colors z-10"
                            >
                                <X className="w-4 h-4 text-[var(--color-text-dim)]" />
                            </button>

                            <div className="flex items-center gap-4 mb-5 relative z-10">
                                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                                    <selectedInstrument.icon className="w-7 h-7 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)]">{selectedInstrument.name}</h3>
                                    <span className={cn("text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border mt-1.5 inline-block shadow-sm", riskColors[selectedInstrument.risk])}>
                                        {selectedInstrument.risk}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-500/20 rounded-xl p-5 mb-6 shadow-sm relative z-10">
                                <p className="text-sm md:text-base text-[var(--color-text-primary)] leading-relaxed font-semibold">
                                    "{selectedInstrument.laymanExplanation}"
                                </p>
                            </div>

                            <div className="space-y-5 relative z-10">
                                <div>
                                    <h4 className="text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-widest mb-3">Key Characteristics</h4>
                                    <ul className="text-sm text-[var(--color-text-muted)] space-y-2">
                                        {selectedInstrument.points.map((pt, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5">
                                                <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                                                <span className="leading-relaxed">{pt}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="pt-4 border-t border-[var(--color-border)]">
                                    <h4 className="text-[10px] font-bold text-[var(--color-text-dim)] uppercase tracking-widest mb-1.5">When Should You Use This?</h4>
                                    <p className="text-sm text-[var(--color-text-primary)] font-medium"><span className="text-blue-400 mr-1.5 text-lg leading-none">↳</span>{selectedInstrument.bestFor}</p>
                                </div>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
