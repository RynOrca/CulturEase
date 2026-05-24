"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadUserProfile, loadDiaries } from "@/lib/storage";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { SIM_SCENARIOS } from "@/lib/types";
import { MOCK_DIARIES, CITY_DATA } from "@/lib/data";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface Props {
  scenario: string;
  onBack: () => void;
}

export function SimChat({ scenario, onBack }: Props) {
  const scenarioLabel = SIM_SCENARIOS.find((s) => s.id === scenario)?.label ?? scenario;
  const [background, setBackground] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [goalAchieved, setGoalAchieved] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const callAgent = useCallback(
    async (history: { role: string; content: string }[]) => {
      const profile = loadUserProfile();
      const userDiaries = loadDiaries();
      const allDiaries = [...userDiaries, ...MOCK_DIARIES];
      const ids = new Set<string>();
      const unique = allDiaries.filter((d) => {
        if (ids.has(d.id)) return false;
        ids.add(d.id);
        return true;
      });

      const config = getApiConfigParams();

      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch("/api/agent/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context: {
            profile: {
              sourceCountry: profile?.sourceCountry ?? "CN",
              targetCountry: profile?.targetCountry ?? "GB",
              targetCity: profile?.targetCity ?? "",
              stage: profile?.stage ?? "pre-departure",
            },
            diaries: unique,
            cityData: CITY_DATA,
          },
          scenario,
          targetCountry: profile?.targetCountry ?? "GB",
          targetCity: profile?.targetCity ?? "",
          sourceCountry: profile?.sourceCountry ?? "CN",
          apiKey: (config as Record<string, unknown>)?.apiKey,
          apiBaseUrl: (config as Record<string, unknown>)?.apiBaseUrl,
          provider: (config as Record<string, unknown>)?.provider,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as Record<string, unknown>)?.message;
        throw new Error(
          typeof msg === "string" ? msg : `请求失败 (${res.status})`
        );
      }

      let fullContent = "";
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));

            if (event.type === "text_delta") {
              fullContent += event.content ?? "";
              setStreamingText(fullContent);
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Agent 错误");
            }
          } catch (err) {
            if (err instanceof Error && err.message !== "Agent 错误") throw err;
            // Skip parse errors for incomplete chunks
          }
        }
      }

      setStreamingText(null);
      return fullContent;
    },
    [scenario]
  );

  const startScenario = async () => {
    setStarted(true);
    setSending(true);
    setErrorDetail(null);

    try {
      const content = await callAgent([]);

      // Strip "---" separators and blank thinking lines
      const cleanContent = content.replace(/^---+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();

      // Extract background
      const bgMatch = cleanContent.match(/【场景背景】([\s\S]*?)(?=\n\n|$)/);
      if (bgMatch) {
        setBackground(bgMatch[1].trim());
        const rest = cleanContent.replace(/【场景背景】[\s\S]*?(?=\n\n|$)/, "").trim();
        if (rest) {
          setMessages([{ role: "ai", content: rest }]);
        }
      } else {
        setMessages([{ role: "ai", content: cleanContent }]);
      }

      if (content.includes("【GOAL_ACHIEVED】")) setGoalAchieved(true);
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "网络连接失败");
      setMessages([
        {
          role: "ai",
          content: err instanceof Error ? err.message : "连接失败，请检查网络后重试。",
        },
      ]);
    }
    setSending(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || goalAchieved) return;
    const userMsg = input.trim();
    setInput("");

    const history = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMsg },
    ];
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setSending(true);
    setErrorDetail(null);

    try {
      const content = await callAgent(history);
      const clean = content.replace("【GOAL_ACHIEVED】", "").trim();
      setMessages((prev) => [...prev, { role: "ai", content: clean }]);
      if (content.includes("【GOAL_ACHIEVED】")) setGoalAchieved(true);
    } catch (err) {
      setErrorDetail(err instanceof Error ? err.message : "网络错误");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: err instanceof Error ? err.message : "网络异常，请检查连接后重试。",
        },
      ]);
    }
    setSending(false);
  };

  const handleContinue = () => {
    abortRef.current?.abort();
    setMessages([]);
    setBackground(null);
    setGoalAchieved(false);
    setErrorDetail(null);
    setInput("");
    setStreamingText(null);
    startScenario();
  };

  if (!started) {
    startScenario();
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <button onClick={onBack} className="text-sm text-slate hover:text-ink mb-1">
            ← 返回
          </button>
          <h2 className="font-display text-xl font-bold text-ink">{scenarioLabel}</h2>
        </div>
      </div>

      {/* Background context banner */}
      <AnimatePresence>
        {background && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-card bg-navy/5 border border-navy/15"
          >
            <div className="text-xs font-semibold text-navy/60 mb-1 uppercase tracking-wider">
              场景背景
            </div>
            <p className="text-sm text-ink leading-relaxed">{background}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      {errorDetail && (
        <div className="mb-3 p-3 rounded-lg bg-rust/5 border border-rust/20 text-rust text-xs">
          {errorDetail}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[85%] min-w-0">
              <div
                className={`rounded-card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-hidden ${
                  msg.role === "user"
                    ? "bg-terracotta/10 text-ink"
                    : "bg-white border border-cream/50 text-slate shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          </motion.div>
        ))}

        {/* Streaming indicator */}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white border border-cream/50 rounded-card px-4 py-3 shadow-sm">
              <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap break-words">
                {streamingText}
                <span className="inline-block w-1.5 h-4 bg-slate/40 ml-0.5 animate-pulse align-middle" />
              </p>
            </div>
          </div>
        )}

        {/* Loading dots (only when sending but no streaming text yet) */}
        {sending && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-white border border-cream/50 rounded-card px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-slate/30 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate/30 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-2 h-2 bg-slate/30 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Success state */}
      <AnimatePresence>
        {goalAchieved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-5 rounded-card bg-sage/10 border border-sage/20 text-center"
          >
            <div className="text-2xl mb-2">&#127881;</div>
            <h3 className="font-display text-lg font-semibold text-sage mb-1">
              沟通成功！
            </h3>
            <p className="text-sm text-slate mb-4">
              要继续练习吗？
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onBack}
                className="px-6 py-2.5 text-sm rounded-lg border border-cream text-slate hover:bg-cream/60 transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleContinue}
                className="px-6 py-2.5 text-sm rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors"
              >
                继续练习
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      {!goalAchieved && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="输入你的回答...（请使用目的地的母语）"
            disabled={sending}
            className="flex-1 px-4 py-3 text-sm rounded-xl border border-cream bg-white text-ink placeholder:text-slate/50 focus:outline-none focus:border-terracotta transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="px-5 py-3 text-sm rounded-xl bg-navy text-white font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            发送
          </button>
        </div>
      )}
    </div>
  );
}
