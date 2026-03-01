"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Fingerprint,
    Smartphone,
    Shield,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    ScrollText,
} from "lucide-react";
import {
    browserSupportsWebAuthn,
    registerPasskey,
    authenticatePasskey,
} from "@/lib/webauthn";

type AuthMode = "login" | "register";
type AuthStep = "idle" | "prompting" | "success" | "error";

export default function AuthPage() {
    const [mode, setMode] = useState<AuthMode>("login");
    const [step, setStep] = useState<AuthStep>("idle");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [message, setMessage] = useState("");
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(true);

    // Disclaimer state
    const [disclaimerOpen, setDisclaimerOpen] = useState(false);
    const [disclaimerScrolledToBottom, setDisclaimerScrolledToBottom] = useState(false);
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
    const disclaimerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSupportsWebAuthn(browserSupportsWebAuthn());
    }, []);

    // Detect when user scrolls to the bottom of the disclaimer
    const handleDisclaimerScroll = useCallback(() => {
        const el = disclaimerRef.current;
        if (!el) return;
        // Allow 10px tolerance for reaching the bottom
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
        if (atBottom) {
            setDisclaimerScrolledToBottom(true);
        }
    }, []);

    // ─── Real FIDO2 Auth ──────────────────────────────────────────────

    const handleAuth = useCallback(async () => {
        if (!username.trim()) {
            setMessage("Please enter your username");
            setStep("error");
            return;
        }

        if (!email.trim() || !email.includes("@")) {
            setMessage("Please enter a valid email address");
            setStep("error");
            return;
        }

        setStep("prompting");
        setMessage(
            mode === "register"
                ? "Creating passkey — follow your browser's prompt..."
                : "Verifying passkey — follow your browser's prompt..."
        );

        try {
            let result;

            if (mode === "register") {
                result = await registerPasskey(
                    username.trim(),
                    (displayName || username).trim()
                );
            } else {
                result = await authenticatePasskey(username.trim());
            }

            if (!result.success) {
                setStep("error");
                setMessage(result.message || "Authentication failed");
                return;
            }

            if (result.token) localStorage.setItem("session_token", result.token);
            if (result.user_id) localStorage.setItem("user_id", result.user_id);
            localStorage.setItem("username", username.trim());

            setStep("success");
            setMessage(result.message);

            setTimeout(() => {
                // After registration → onboarding questionnaire; after login → dashboard
                window.location.href = mode === "register" ? "/onboarding" : "/dashboard";
            }, 1500);
        } catch (error) {
            setStep("error");
            if (error instanceof Error) {
                if (error.name === "NotAllowedError") {
                    setMessage("Authentication cancelled. Try again when ready.");
                } else {
                    setMessage(`Error: ${error.message}`);
                }
            } else {
                setMessage("An unexpected error occurred");
            }
        }
    }, [mode, username, displayName]);

    // Button disabled logic
    const isButtonDisabled =
        step === "prompting" || (mode === "register" && !disclaimerAccepted);

    // ─── Render ───────────────────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center p-4 dot-pattern">
            {/* Background glow orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md"
            >
                <div className="glass-strong rounded-3xl p-8 glow-blue">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/15 flex items-center justify-center glow-blue-strong"
                        >
                            <Shield className="w-8 h-8 text-blue-400" />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
                            {mode === "login" ? "Welcome Back" : "Create Account"}
                        </h1>
                        <p className="text-[var(--color-text-muted)] text-sm">
                            {mode === "login"
                                ? "Sign in with your passkey — no passwords needed"
                                : "Secure your account with biometric authentication"}
                        </p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex rounded-xl bg-[var(--color-bg-primary)]/60 p-1 mb-6">
                        {(["login", "register"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMode(m);
                                    setStep("idle");
                                    setMessage("");
                                }}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${mode === m
                                    ? "bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/10"
                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                    }`}
                            >
                                {m === "login" ? "Sign In" : "Register"}
                            </button>
                        ))}
                    </div>

                    {/* Form */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                disabled={step === "prompting"}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)]/80 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                disabled={step === "prompting"}
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)]/80 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                            />
                        </div>

                        <AnimatePresence>
                            {mode === "register" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="Your display name"
                                            disabled={step === "prompting"}
                                            className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)]/80 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all disabled:opacity-50"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* ── Disclaimer Checkbox (Registration only) ── */}
                    <AnimatePresence>
                        {mode === "register" && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mb-4"
                            >
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={disclaimerAccepted}
                                        disabled={!disclaimerScrolledToBottom}
                                        onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                                        className="w-4 h-4 rounded border-2 border-[var(--color-border)] bg-transparent checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 focus:ring-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed accent-blue-500"
                                    />
                                    <span className="text-sm text-[var(--color-text-muted)] leading-relaxed block mt-0.5">
                                        I confirm that I have read, understood, and agree to the{" "}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setDisclaimerOpen(true);
                                                setDisclaimerScrolledToBottom(false);
                                            }}
                                            className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors font-medium"
                                        >
                                            Disclaimer
                                        </button>.
                                        {/* <br />
                                        <span className="text-xs text-[var(--color-text-dim)] mt-1 block">
                                            I acknowledge that this platform provides AI-generated financial insights for educational purposes only and does not constitute investment advice.
                                        </span> */}
                                    </span>
                                </label>
                                {!disclaimerScrolledToBottom && (
                                    <p className="text-[10px] text-[var(--color-text-dim)] mt-1.5 ml-7">
                                        Open and read the disclaimer to enable registration
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Primary Auth Button */}
                    <motion.button
                        whileHover={{ scale: isButtonDisabled ? 1 : 1.01 }}
                        whileTap={{ scale: isButtonDisabled ? 1 : 0.98 }}
                        onClick={handleAuth}
                        disabled={isButtonDisabled}
                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {step === "prompting" ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Waiting for browser...
                            </>
                        ) : (
                            <>
                                <Fingerprint className="w-5 h-5" />
                                {mode === "login" ? "Sign in with Passkey" : "Register Passkey"}
                            </>
                        )}
                    </motion.button>

                    {/* Info callout */}
                    <div className="mt-4 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[var(--color-text-muted)] text-xs space-y-1">
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span>
                                {mode === "login"
                                    ? "Your browser will show options: security key, biometrics, or phone via QR"
                                    : "Choose how to create your passkey: this device, security key, or your phone"}
                            </span>
                        </div>
                        <p className="pl-5.5 text-[var(--color-text-dim)]">
                            The &ldquo;Use a phone or tablet&rdquo; option uses FIDO2 Hybrid Transport
                            (Bluetooth proximity + QR) — no custom QR needed.
                        </p>
                    </div>

                    {/* Status Messages */}
                    <AnimatePresence>
                        {(step === "success" || step === "error") && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${step === "success"
                                    ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                    : "bg-red-500/10 text-red-300 border border-red-500/20"
                                    }`}
                            >
                                {step === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                )}
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!supportsWebAuthn && (
                        <div className="mt-4 p-3 rounded-xl bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            Your browser doesn&apos;t support WebAuthn. Use Chrome, Safari, or Edge.
                        </div>
                    )}
                </div>

                {/* Security badges */}
                <div className="flex items-center justify-center gap-4 mt-6 text-[var(--color-text-dim)] text-xs">
                    <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> FIDO2 Certified
                    </span>
                    <span>•</span>
                    <span>AES-256 Encrypted</span>
                    <span>•</span>
                    <span>Zero-Knowledge</span>
                </div>
            </motion.div>

            {/* ═══════════ DISCLAIMER MODAL ═══════════ */}
            <AnimatePresence>
                {disclaimerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDisclaimerOpen(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 40, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col glass-strong rounded-2xl border border-[var(--color-border)] glow-blue overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
                                <div className="flex items-center gap-2">
                                    <ScrollText className="w-5 h-5 text-blue-400" />
                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                                        Disclaimer
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setDisclaimerOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-primary)]/80 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Disclaimer Content */}
                            <div
                                ref={disclaimerRef}
                                onScroll={handleDisclaimerScroll}
                                className="flex-1 overflow-y-auto px-6 py-5 text-base text-[var(--color-text-secondary)] leading-relaxed space-y-4 scroll-smooth"
                                style={{ maxHeight: "60vh" }}
                            >
                                <h3 className="text-blue-400 font-bold text-lg">
                                    DISCLAIMER
                                </h3>

                                <p>
                                    Welcome to <strong>ArthNiti</strong>. This Legal Disclaimer governs your use of our AI-powered financial guidance platform. By accessing, registering, or using this Platform, you acknowledge that you have read, understood, and agreed to the terms outlined below.
                                    <br /><br />
                                    If you do not agree with these terms, please refrain from using the Platform.
                                </p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    Educational and Informational Purpose Only
                                </h4>
                                <p>
                                    This Platform provides AI-generated financial guidance for educational and informational purposes only. The content, analysis, forecasts, scores, projections, insights, simulations, and recommendations available through the Platform are designed to improve financial literacy and awareness.
                                </p>
                                <p className="mt-2">The Platform does not provide:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Stock or securities recommendations</li>
                                    <li>Tax advice or Legal advice</li>
                                    <li>Accounting advice</li>
                                    <li>Insurance advisory services</li>
                                </ul>
                                <p className="mt-2 font-medium text-[var(--color-text-primary)]">Nothing on this Platform constitutes professional advice of any kind.</p>
                                <p>Users are strongly encouraged to consult certified financial advisors, registered investment advisors, chartered accountants, or other licensed professionals before making any financial decisions.</p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    No Investment Advice Clause
                                </h4>
                                <p>
                                    The Platform does not recommend, endorse, or promote specific financial instruments, securities, or investment products.
                                </p>
                                <p className="mt-2">
                                    References to financial instruments including, but not limited to: Fixed Deposits (FD), Recurring Deposits (RD), Mutual Funds, Stocks, Exchange Traded Funds (ETFs), Bonds, Gold (Physical or Digital), Crypto Assets, and Insurance products are provided solely for general educational awareness.
                                </p>
                                <p className="mt-2 text-sm">The Platform does not:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Assess individual suitability under regulatory standards</li>
                                    <li>Provide buy/sell/hold instructions</li>
                                    <li>Guarantee returns or capital protection</li>
                                    <li>Act as a broker, dealer, or investment intermediary</li>
                                </ul>
                                <p className="mt-2 font-medium">All financial decisions remain solely at the discretion and responsibility of the user.</p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    AI-Generated Insights &amp; Explainability Notice
                                </h4>
                                <p>
                                    The Platform utilizes artificial intelligence, machine learning models, statistical forecasting systems, and automated categorization tools to generate: Financial health scores, Spending analytics, Budgeting suggestions, Savings optimization strategies, Cash flow forecasts, Goal-based financial projections, and Risk insights.
                                </p>
                                <p className="mt-2 text-sm">AI outputs:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Are probabilistic and model-based</li>
                                    <li>Depend on the accuracy and completeness of input data</li>
                                    <li>May involve assumptions and estimated categorization</li>
                                    <li>May produce inaccurate or incomplete results</li>
                                </ul>
                                <p className="mt-2">
                                    The Platform provides explainable reasoning where possible; however, users acknowledge that algorithmic systems are not infallible. <strong>No AI-generated output should be interpreted as definitive financial advice.</strong>
                                </p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    Data Accuracy and User Responsibility
                                </h4>
                                <p>
                                    The Platform relies on: User-provided information, Uploaded documents (e.g., bank statements), Connected financial data sources, Automatically categorized transaction records, and Estimated projections based on historical patterns.
                                </p>
                                <p className="mt-2 mb-1">Users are responsible for:</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Verifying the correctness of their financial data</li>
                                    <li>Reviewing transaction categorizations and confirming projections</li>
                                    <li>Independently evaluating financial decisions</li>
                                </ul>
                                <p className="mt-2 font-medium text-red-400">
                                    The Platform shall not be liable for any financial loss, damage, or consequence resulting from reliance on inaccurate data.
                                </p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    Risk Awareness Statement
                                </h4>
                                <p>
                                    All financial instruments and financial decisions carry inherent risks, including but not limited to Loss of capital, Market volatility, Liquidity constraints, Regulatory changes, Economic fluctuations, and Inflation risk.
                                </p>
                                <p className="mt-2">
                                    Market-linked instruments such as equities, mutual funds, ETFs, and crypto assets are subject to price fluctuations and may result in partial or total loss of investment. Past performance, statistical modeling, or AI-based forecasts do not guarantee future results.
                                </p>
                                <p className="mt-2">Users should carefully assess their financial capacity, risk tolerance, and investment horizon before making any financial commitments.</p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    Data Privacy &amp; Security Commitment
                                </h4>
                                <p>
                                    We process financial data only with explicit user consent, implement encryption and secure storage mechanisms, restrict unauthorized access, and do not sell personal financial data to third parties. Users may revoke access or request deletion of personal data at any time.
                                </p>
                                <p className="mt-2">
                                    Despite security measures, no digital system can guarantee absolute security. Users acknowledge inherent risks associated with online data transmission.
                                </p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    Limitation of Liability
                                </h4>
                                <p>
                                    To the fullest extent permitted by applicable law, the Platform, its founders, employees, affiliates, developers, and partners shall not be liable for: Direct or indirect financial losses, Investment losses, Business interruption, Data inaccuracies, Missed financial opportunities, System downtime, or Consequential damages.
                                </p>
                                <p className="mt-2 font-medium">Use of the Platform is strictly at the user&apos;s own risk.</p>

                                <h4 className="text-[var(--color-text-primary)] font-semibold mt-4 text-sm">
                                    Ethical AI Compliance Statement
                                </h4>
                                <p>
                                    The Platform is designed in alignment with responsible AI principles. We aim to promote transparency in automated decision-making, provide explainable financial insights, avoid misleading outputs, reduce algorithm bias, and maintain compliance. AI-generated outputs are intended to assist financial literacy, not replace human professional judgment.
                                </p>

                                <p className="mt-6 italic text-xs text-[var(--color-text-dim)]">
                                    We reserve the right to update, modify, or revise this Disclaimer at any time without prior notice. Continued use of the Platform following updates constitutes acceptance of the revised terms.
                                </p>

                                {/* Scroll anchor — the user must reach this */}
                                <div className="pt-4 pb-2 border-t border-[var(--color-border)] mt-6">
                                    <p className="text-blue-400 text-xs font-medium text-center">
                                        ✅ You have read the complete disclaimer.
                                    </p>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
                                <p className="text-sm text-white font-medium">
                                    {disclaimerScrolledToBottom
                                        ? "✅ You may now close and accept"
                                        : "⬇️ Scroll down to read the full disclaimer"}
                                </p>
                                <button
                                    onClick={() => {
                                        if (disclaimerScrolledToBottom) {
                                            setDisclaimerAccepted(true);
                                        }
                                        setDisclaimerOpen(false);
                                    }}
                                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${disclaimerScrolledToBottom
                                        ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/25"
                                        : "bg-[var(--color-bg-primary)]/60 text-[var(--color-text-dim)] border border-[var(--color-border)]"
                                        }`}
                                >
                                    {disclaimerScrolledToBottom ? "Close & Accept" : "Close"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
