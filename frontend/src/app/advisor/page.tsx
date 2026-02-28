"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Send,
    BotMessageSquare,
    User,
    Brain,
    ChevronDown,
    ChevronRight,
    Sparkles,
    Loader2,
    Lightbulb,
    Copy,
    Check,
    StopCircle,
    Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import {
    streamChat,
    buildSystemPrompt,
    type ChatMessage,
    type StreamStatus,
} from "@/lib/ai-stream";
import { useRiskProfile } from "@/hooks/useFinancialData";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    thinking?: string;
    timestamp: Date;
    isStreaming?: boolean;
    status?: StreamStatus;
}

// ─── CoT Accordion ──────────────────────────────────────────────────────────

function ThinkingBlock({
    thinking,
    status,
}: {
    thinking: string;
    status?: StreamStatus;
}) {
    const [expanded, setExpanded] = useState(false);
    const isActivelyThinking = status === "thinking";

    // Auto-expand while AI is thinking
    useEffect(() => {
        if (isActivelyThinking) setExpanded(true);
    }, [isActivelyThinking]);

    if (!thinking) return null;

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3"
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs font-medium text-blue-400/70 hover:text-blue-300 transition-colors group"
            >
                <div
                    className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                        isActivelyThinking
                            ? "bg-blue-500/20 animate-pulse"
                            : "bg-blue-500/10 group-hover:bg-blue-500/15"
                    )}
                >
                    <Brain className="w-3 h-3" />
                </div>
                <span>
                    {isActivelyThinking ? (
                        <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            AI is reasoning...
                        </span>
                    ) : (
                        "View Logic (Chain-of-Thought)"
                    )}
                </span>
                {expanded ? (
                    <ChevronDown className="w-3 h-3" />
                ) : (
                    <ChevronRight className="w-3 h-3" />
                )}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-[var(--color-text-muted)] leading-relaxed font-mono overflow-hidden max-h-60 overflow-y-auto"
                    >
                        <div className="whitespace-pre-wrap">{thinking}</div>
                        {isActivelyThinking && <span className="cursor-blink" />}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => (
                    <strong className="text-blue-300 font-semibold">{children}</strong>
                ),
                em: ({ children }) => (
                    <em className="text-[var(--color-text-secondary)] italic">{children}</em>
                ),
                ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1 text-[var(--color-text-muted)]">
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1 text-[var(--color-text-muted)]">
                        {children}
                    </ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-[var(--color-text-primary)] mt-3 mb-2">
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className="text-base font-semibold text-[var(--color-text-primary)] mt-3 mb-1.5">
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-blue-300 mt-2 mb-1">
                        {children}
                    </h3>
                ),
                code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                        <code className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-300 text-xs font-mono">
                            {children}
                        </code>
                    ) : (
                        <code className="block p-3 rounded-xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-xs font-mono overflow-x-auto mb-2">
                            {children}
                        </code>
                    );
                },
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-blue-500/30 pl-3 italic text-[var(--color-text-muted)] my-2">
                        {children}
                    </blockquote>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === "user";

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
        >
            {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-1">
                    <BotMessageSquare className="w-4 h-4 text-blue-400" />
                </div>
            )}

            <div className={cn("max-w-[75%]", isUser ? "order-first" : "")}>
                <div
                    className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        isUser
                            ? "bg-blue-600/30 text-[var(--color-text-primary)] border border-blue-500/20 rounded-tr-md"
                            : "bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-tl-md"
                    )}
                >
                    {/* Status indicator for connecting/thinking */}
                    {message.isStreaming && !message.content && message.status !== "responding" && (
                        <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {message.status === "connecting"
                                ? "Connecting to DeepSeek-R1..."
                                : message.status === "thinking"
                                    ? "AI is reasoning through your question..."
                                    : "Thinking..."}
                        </span>
                    )}

                    {/* Markdown render for assistant, plain text for user */}
                    {isUser ? (
                        message.content
                    ) : message.content ? (
                        <MarkdownContent content={message.content} />
                    ) : null}

                    {/* Streaming cursor */}
                    {message.isStreaming && message.content && message.status === "responding" && (
                        <span className="cursor-blink" />
                    )}
                </div>

                {/* CoT Block */}
                {!isUser && message.thinking && (
                    <ThinkingBlock thinking={message.thinking} status={message.isStreaming ? message.status : "done"} />
                )}

                {/* Actions */}
                {!isUser && !message.isStreaming && message.content && (
                    <div className="flex items-center gap-2 mt-1.5 px-1">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text-muted)] transition-colors"
                        >
                            {copied ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    </div>
                )}
            </div>

            {isUser && (
                <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-elevated)] flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-[var(--color-text-muted)]" />
                </div>
            )}
        </motion.div>
    );
}

// ─── Suggested Prompts ──────────────────────────────────────────────────────

const suggestions = [
    { icon: Lightbulb, text: "How should I split my ₹5,400 income using the 50/30/20 rule?" },
    { icon: Sparkles, text: "My entertainment spending spiked 45%. What should I do?" },
    { icon: Brain, text: "Explain the debt avalanche strategy for my education loan." },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdvisorPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const { riskProfile } = useRiskProfile();

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    const stopStream = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        setIsStreaming(false);
        setMessages((prev) =>
            prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false, status: "done" } : m))
        );
    }, []);

    const sendMessage = useCallback(
        async (text: string) => {
            if (!text.trim() || isStreaming) return;

            const userMsg: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: text.trim(),
                timestamp: new Date(),
            };

            const asstId = crypto.randomUUID();
            const asstMsg: Message = {
                id: asstId,
                role: "assistant",
                content: "",
                thinking: "",
                timestamp: new Date(),
                isStreaming: true,
                status: "connecting",
            };

            setMessages((prev) => [...prev, userMsg, asstMsg]);
            setInput("");
            setIsStreaming(true);

            // Build conversation for Ollama
            const history: ChatMessage[] = messages.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            }));

            const systemPrompt = buildSystemPrompt(riskProfile);

            const payload: ChatMessage[] = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: text.trim() },
            ];

            const abort = new AbortController();
            abortRef.current = abort;

            await streamChat(
                payload,
                {
                    onContent: (content) => {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === asstId ? { ...m, content } : m))
                        );
                    },
                    onThinking: (thinking) => {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === asstId ? { ...m, thinking } : m))
                        );
                    },
                    onStatus: (status) => {
                        setMessages((prev) =>
                            prev.map((m) => (m.id === asstId ? { ...m, status } : m))
                        );
                    },
                    onDone: (finalContent, finalThinking) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === asstId
                                    ? { ...m, content: finalContent, thinking: finalThinking, isStreaming: false, status: "done" }
                                    : m
                            )
                        );
                        setIsStreaming(false);
                        abortRef.current = null;
                    },
                    onError: (error) => {
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === asstId
                                    ? {
                                        ...m,
                                        content: `⚠️ **Connection Error**\n\n${error.message}\n\nMake sure Ollama is running on \`localhost:11434\` with \`deepseek-r1:8b\` loaded.`,
                                        isStreaming: false,
                                        status: "error",
                                    }
                                    : m
                            )
                        );
                        setIsStreaming(false);
                    },
                },
                abort.signal
            );
        },
        [messages, isStreaming, riskProfile]
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full pt-24 pb-4 px-4">
                {/* Risk profile badge */}
                {riskProfile && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/15 text-xs text-blue-400 w-fit"
                    >
                        <Shield className="w-3 h-3" />
                        AI knows your profile: <span className="font-semibold">{riskProfile.risk_category}</span> (Score: {riskProfile.health_score}/100)
                    </motion.div>
                )}

                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pb-4">
                    {/* Empty State */}
                    {messages.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full text-center pt-20"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6 glow-blue">
                                <BotMessageSquare className="w-10 h-10 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                                ArthNiti AI Advisor
                            </h2>
                            <p className="text-[var(--color-text-muted)] max-w-md mb-8">
                                Ask me about budgeting, savings, debt, or investments. All analysis runs{" "}
                                <span className="text-blue-400 font-medium">locally on your GPU</span>
                                {riskProfile
                                    ? ` — tailored to your ${riskProfile.risk_category} profile.`
                                    : ". Complete the risk quiz to get personalized advice."}
                            </p>
                            <div className="grid gap-3 w-full max-w-lg">
                                {suggestions.map((s, i) => (
                                    <motion.button
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 * i }}
                                        whileHover={{ scale: 1.01, x: 4 }}
                                        onClick={() => sendMessage(s.text)}
                                        className="card p-4 text-left flex items-center gap-3 group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/15 transition-colors">
                                            <s.icon className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <span className="text-sm text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">
                                            {s.text}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                </div>

                {/* Input */}
                <div className="pt-4 border-t border-[var(--color-border)]">
                    <form onSubmit={handleSubmit} className="flex items-end gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your finances..."
                            rows={1}
                            className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none text-sm"
                            style={{ minHeight: 48, maxHeight: 120 }}
                        />
                        {isStreaming ? (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={stopStream}
                                className="w-12 h-12 rounded-xl bg-red-600/80 hover:bg-red-500 flex items-center justify-center text-white transition-colors shadow-lg"
                            >
                                <StopCircle className="w-5 h-5" />
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={!input.trim()}
                                className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                            >
                                <Send className="w-5 h-5" />
                            </motion.button>
                        )}
                    </form>
                    <p className="text-xs text-[var(--color-text-dim)] text-center mt-3">
                        DeepSeek-R1 on RTX 4060 • All data on-device • {riskProfile ? `${riskProfile.risk_category} profile active` : "No risk profile set"}
                    </p>
                </div>
            </main>
        </div>
    );
}
