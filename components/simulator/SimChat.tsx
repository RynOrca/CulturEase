"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadUserProfile } from "@/lib/storage";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { SIM_SCENARIOS } from "@/lib/types";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, goalAchieved]);

  const startScenario = async () => {
    setStarted(true);
    setSending(true);
    setErrorDetail(null);
    const profile = loadUserProfile();
    try {
      const res = await fetch("/api/ai/simulate-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          targetCountry: profile?.targetCountry ?? "GB",
          targetCity: profile?.targetCity ?? "",
          sourceCountry: profile?.sourceCountry ?? "CN",
          history: [],
          ...getApiConfigParams(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Extract background from first response
        const content = data.response;
        const bgMatch = content.match(/【场景背景】([\s\S]*?)(?=\n\n|$)/);
        if (bgMatch) {
          setBackground(bgMatch[1].trim());
          const rest = content.replace(/【场景背景】[\s\S]*?(?=\n\n|$)/, "").trim();
          if (rest) {
            setMessages([{ role: "ai", content: rest }]);
          }
        } else {
          setMessages([{ role: "ai", content }]);
        }
        if (data.goalAchieved) setGoalAchieved(true);
      } else if (res.status === 503) {
        setErrorDetail("AI 服务未配置。请在设置中配置 API Key。");
        setMessages([{
          role: "ai",
          content: "AI 服务未配置。请先在设置中配置 API Key（DeepSeek/OpenAI/Anthropic 均可）。配置后重新进入场景即可。",
        }]);
      } else {
        setErrorDetail(data.message || "AI 服务暂时不可用");
        setMessages([{
          role: "ai",
          content: `抱歉，AI 服务遇到了问题。${data.message || "请检查 API Key 配置或稍后重试。"}`,
        }]);
      }
    } catch {
      setErrorDetail("网络连接失败");
      setMessages([{ role: "ai", content: "连接失败，请检查网络后重试。" }]);
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

    const profile = loadUserProfile();
    try {
      const res = await fetch("/api/ai/simulate-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          targetCountry: profile?.targetCountry ?? "GB",
          targetCity: profile?.targetCity ?? "",
          sourceCountry: profile?.sourceCountry ?? "CN",
          history,
          ...getApiConfigParams(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "ai", content: data.response }]);
        if (data.goalAchieved) setGoalAchieved(true);
      } else {
        const errMsg = res.status === 503
          ? "AI 服务未配置，请在设置中配置 API Key。"
          : (data.message || "AI 服务遇到了问题。请稍后重试。");
        setErrorDetail(errMsg);
        setMessages((prev) => [...prev, { role: "ai", content: errMsg }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "网络异常，请检查连接后重试。" },
      ]);
    }
    setSending(false);
  };

  const handleContinue = () => {
    setMessages([]);
    setBackground(null);
    setGoalAchieved(false);
    setErrorDetail(null);
    setInput("");
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
            <div className="max-w-[80%]">
              <div
                className={`rounded-card px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
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
        {sending && (
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
