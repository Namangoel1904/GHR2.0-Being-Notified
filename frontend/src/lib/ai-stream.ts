import { API_BASE } from "./utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StreamCallbacks {
    /** Called for each visible content token */
    onContent: (accumulated: string) => void;
    /** Called for each CoT reasoning token */
    onThinking: (accumulated: string) => void;
    /** Called when stream is done */
    onDone: (finalContent: string, finalThinking: string) => void;
    /** Called on error */
    onError: (error: Error) => void;
    /** Called when status changes ("connecting" | "thinking" | "responding" | "done") */
    onStatus?: (status: StreamStatus) => void;
}

export type StreamStatus = "connecting" | "thinking" | "responding" | "done" | "error";

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

// ─── CoT Tag State Machine ─────────────────────────────────────────────────

class CoTParser {
    private raw = "";
    private inThinkBlock = false;
    private thinkContent = "";
    private visibleContent = "";
    private thinkTagBuffer = "";

    reset() {
        this.raw = "";
        this.inThinkBlock = false;
        this.thinkContent = "";
        this.visibleContent = "";
        this.thinkTagBuffer = "";
    }

    /**
     * Feed new tokens into the parser. Returns the current parsed state.
     * Handles partial tag delivery (e.g., "<thi" then "nk>").
     */
    feed(token: string): { content: string; thinking: string; isThinking: boolean } {
        this.raw += token;

        for (const char of token) {
            if (this.thinkTagBuffer.length > 0) {
                this.thinkTagBuffer += char;

                // Check for complete <think> open tag
                if (this.thinkTagBuffer === "<think>") {
                    this.inThinkBlock = true;
                    this.thinkTagBuffer = "";
                    continue;
                }

                // Check for complete </think> close tag
                if (this.thinkTagBuffer === "</think>") {
                    this.inThinkBlock = false;
                    this.thinkTagBuffer = "";
                    continue;
                }

                // Still a potential tag prefix?
                if ("<think>".startsWith(this.thinkTagBuffer) || "</think>".startsWith(this.thinkTagBuffer)) {
                    continue; // Keep buffering
                }

                // Not a tag — flush buffer to appropriate target
                if (this.inThinkBlock) {
                    this.thinkContent += this.thinkTagBuffer;
                } else {
                    this.visibleContent += this.thinkTagBuffer;
                }
                this.thinkTagBuffer = "";
                continue;
            }

            // Start potential tag detection
            if (char === "<") {
                this.thinkTagBuffer = "<";
                continue;
            }

            // Normal character
            if (this.inThinkBlock) {
                this.thinkContent += char;
            } else {
                this.visibleContent += char;
            }
        }

        return {
            content: this.visibleContent.trim(),
            thinking: this.thinkContent.trim(),
            isThinking: this.inThinkBlock,
        };
    }

    getResult() {
        // Flush any remaining tag buffer
        if (this.thinkTagBuffer) {
            if (this.inThinkBlock) {
                this.thinkContent += this.thinkTagBuffer;
            } else {
                this.visibleContent += this.thinkTagBuffer;
            }
            this.thinkTagBuffer = "";
        }

        return {
            content: this.visibleContent.trim(),
            thinking: this.thinkContent.trim(),
        };
    }
}

// ─── Build System Prompt with Risk Profile ──────────────────────────────────

export function buildSystemPrompt(riskProfile?: {
    risk_category: string;
    health_score: number;
    recommendations: string[];
} | null): string {
    let base = `You are FinAegis, a privacy-first AI financial advisor running locally on the user's device. All data stays on-device.

RULES:
- Provide actionable, explainable budgeting and savings insights.
- Always wrap your internal reasoning in <think></think> tags FIRST, then provide the user-visible answer OUTSIDE those tags.
- Format currency in ₹ (Indian Rupees).
- Be empathetic, educational, and specific.
- Use markdown formatting (bold, lists, headers) in your visible answer.`;

    if (riskProfile) {
        base += `\n\nUSER RISK PROFILE:
- Risk Category: ${riskProfile.risk_category}
- Financial Health Score: ${riskProfile.health_score}/100
- Key Recommendations: ${riskProfile.recommendations.join("; ")}

Tailor ALL advice to this profile. For "${riskProfile.risk_category}" users:
${riskProfile.risk_category === "Conservative"
                ? "- Prioritize capital preservation, emergency funds, and fixed deposits.\n- Avoid suggesting volatile investments.\n- Focus on debt repayment and insurance."
                : riskProfile.risk_category === "Moderate"
                    ? "- Balance between growth and safety.\n- Suggest diversified index funds alongside savings.\n- Moderate risk tolerance for long-term goals."
                    : "- Suggest growth-oriented strategies: equities, SIPs, sector funds.\n- Accept short-term volatility for long-term gains.\n- Focus on wealth accumulation and portfolio diversification."}`;
    }

    return base;
}

// ─── Main Stream Function ───────────────────────────────────────────────────

export async function streamChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    abortSignal?: AbortSignal
): Promise<void> {
    const parser = new CoTParser();

    callbacks.onStatus?.("connecting");

    try {
        const response = await fetch(`${API_BASE}/api/ai/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ messages }),
            signal: abortSignal,
        });

        if (!response.ok) {
            throw new Error(`API error ${response.status}: ${await response.text()}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;

                const data = line.slice(6).trim();
                if (!data || data === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(data);

                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }

                    if (parsed.content) {
                        const state = parser.feed(parsed.content);

                        if (state.isThinking) {
                            callbacks.onStatus?.("thinking");
                            callbacks.onThinking(state.thinking);
                        } else {
                            callbacks.onStatus?.("responding");
                            callbacks.onContent(state.content);
                            callbacks.onThinking(state.thinking);
                        }
                    }

                    if (parsed.done) {
                        const final = parser.getResult();
                        callbacks.onStatus?.("done");
                        callbacks.onDone(final.content, final.thinking);
                        return;
                    }
                } catch (e) {
                    if (e instanceof SyntaxError) continue; // Partial JSON
                    throw e;
                }
            }
        }

        // Stream ended without explicit done signal
        const final = parser.getResult();
        callbacks.onStatus?.("done");
        callbacks.onDone(final.content, final.thinking);
    } catch (error) {
        if ((error as Error).name === "AbortError") return;

        callbacks.onStatus?.("error");
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
}
