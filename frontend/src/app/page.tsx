"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Brain,
  Fingerprint,
  Lock,
  ArrowRight,
  Sparkles,
  Eye,
  Cpu,
} from "lucide-react";

const features = [
  {
    icon: Fingerprint,
    title: "Passwordless Auth",
    description:
      "FIDO2 passkeys & biometrics. Your phone becomes your hardware token via Bluetooth hybrid transport.",
    gradient: "from-blue-500/20 to-blue-600/10",
  },
  {
    icon: Brain,
    title: "Local AI Engine",
    description:
      "DeepSeek-R1 runs on your GPU. Your financial data never touches a cloud server. Ever.",
    gradient: "from-blue-400/20 to-blue-500/10",
  },
  {
    icon: Eye,
    title: "Explainable AI (XAI)",
    description:
      "See the AI's Chain-of-Thought reasoning. No black boxes — every suggestion is transparent.",
    gradient: "from-blue-300/20 to-blue-400/10",
  },
  {
    icon: Lock,
    title: "AES-256 Encryption",
    description:
      "Financial data encrypted at rest with AES-256-GCM. Even the database sees only ciphertext.",
    gradient: "from-blue-600/20 to-blue-700/10",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen dot-pattern">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/3 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-4 py-6">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center glow-blue">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-gradient">Fin</span>Aegis
            </span>
          </div>
          <Link
            href="/auth"
            className="px-5 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-500 text-white text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Fingerprint className="w-4 h-4" />
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-4 pt-20 pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-8">
              <Cpu className="w-3 h-3" />
              Powered by Local AI — Zero Cloud Dependency
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="text-[var(--color-text-primary)]">
                Predict.
              </span>
              <br />
              <span className="text-gradient">Plan.</span>
              <br />
              <span className="text-[var(--color-text-primary)]">
                Protect.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
              AI-powered financial advisory that runs{" "}
              <span className="text-blue-300 font-medium">
                entirely on your machine
              </span>
              . Passwordless auth. AES-256 encryption. Explainable insights that
              turn you into your own financial expert.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/auth"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg flex items-center gap-2.5 hover:from-blue-500 hover:to-blue-400 transition-all shadow-2xl shadow-blue-500/25 glow-blue-strong"
              >
                Start Now — It&apos;s Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-2xl border border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium text-lg hover:border-blue-500/30 hover:bg-[var(--color-bg-card)] transition-all"
              >
                View Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative z-10 px-4 pb-32">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className={`card p-8 bg-gradient-to-br ${feature.gradient}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[var(--color-text-muted)] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security Banner */}
      <section className="relative z-10 px-4 pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="glass-strong rounded-3xl p-10 glow-blue">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
              Built for National Hackathon Standards
            </h2>
            <p className="text-[var(--color-text-muted)] mb-6 max-w-xl mx-auto">
              FIDO2-certified passwordless auth. Zero-knowledge architecture.
              Local LLM with explainable Chain-of-Thought reasoning.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-[var(--color-text-dim)]">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-500" />
                FIDO2
              </span>
              <span>•</span>
              <span>AES-256-GCM</span>
              <span>•</span>
              <span>WebAuthn</span>
              <span>•</span>
              <span>On-Device AI</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
