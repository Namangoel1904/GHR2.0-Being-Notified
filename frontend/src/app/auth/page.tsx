"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Fingerprint,
    Smartphone,
    Shield,
    CheckCircle2,
    AlertCircle,
    Loader2,
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
    const [displayName, setDisplayName] = useState("");
    const [message, setMessage] = useState("");
    const [supportsWebAuthn, setSupportsWebAuthn] = useState(true);

    useEffect(() => {
        setSupportsWebAuthn(browserSupportsWebAuthn());
    }, []);

    // ─── Real FIDO2 Auth ──────────────────────────────────────────────

    const handleAuth = useCallback(async () => {
        if (!username.trim()) {
            setMessage("Please enter your username");
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
                // registerPasskey() internally:
                //   1. POST /register/start → gets WebAuthn challenge
                //   2. startRegistration()  → browser shows native passkey/biometric/QR prompt
                //   3. POST /register/finish → server verifies + stores credential
                result = await registerPasskey(
                    username.trim(),
                    (displayName || username).trim()
                );
            } else {
                // authenticatePasskey() internally:
                //   1. POST /login/start → gets assertion challenge
                //   2. startAuthentication() → browser shows native prompt
                //      (includes "Use a phone or tablet" for hybrid/QR transport)
                //   3. POST /login/finish → server verifies signed assertion
                result = await authenticatePasskey(username.trim());
            }

            if (!result.success) {
                setStep("error");
                setMessage(result.message || "Authentication failed");
                return;
            }

            // Store session data
            if (result.token) localStorage.setItem("session_token", result.token);
            if (result.user_id) localStorage.setItem("user_id", result.user_id);
            localStorage.setItem("username", username.trim());

            setStep("success");
            setMessage(result.message);

            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);
        } catch (error) {
            setStep("error");
            if (error instanceof Error) {
                // User cancelled the browser prompt
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

    // ─── Render ───────────────────────────────────────────────────────

    return (
        <div className="min-h-screen flex items-center justify-center p-4 dot-pattern">
            {/* Background glow orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-md"
            >
                <div className="glass-strong rounded-3xl p-8 glow-emerald">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center glow-emerald-strong"
                        >
                            <Shield className="w-8 h-8 text-emerald-400" />
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
                                        ? "bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10"
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
                                className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)]/80 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                            />
                        </div>

                        <AnimatePresence>
                            {mode === "register" && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                                        Display Name
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your display name"
                                        disabled={step === "prompting"}
                                        className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-primary)]/80 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Primary Auth Button — triggers native browser FIDO2 dialog */}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAuth}
                        disabled={step === "prompting"}
                        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:from-emerald-500 hover:to-emerald-400 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[var(--color-text-muted)] text-xs space-y-1">
                        <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
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
                                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
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

                    {/* WebAuthn Support Warning */}
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
        </div>
    );
}
