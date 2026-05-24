"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { loadUserProfile, loadDiaries, loadKitProgress, loadCachedKit, saveKitProgress } from "@/lib/storage";
import { generateSessionId, loadSession, saveSession } from "@/lib/agent/memory";
import type { SurvivalKit } from "@/lib/types";
import type { AgentMessage } from "@/lib/agent/types";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { useAgentStream } from "@/lib/agent/useAgent";
import { SimChat } from "@/components/simulator/SimChat";
import { ScenarioSelector } from "@/components/simulator/ScenarioSelector";
import { QuizSection } from "@/components/quiz/QuizSection";
import { MOCK_DIARIES, CITY_DATA } from "@/lib/data";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

type Mode = "report" | "chat" | "simulate";

function CoachContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("report");
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    sourceCountry: string;
    targetCountry: string;
    targetCity: string;
    stage: string;
  } | null>(null);
  const [simScenario, setSimScenario] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [kitData, setKitData] = useState<SurvivalKit | null>(null);
  const [kitProgress, setKitProgress] = useState<Record<string, boolean>>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [initialMessages, setInitialMessages] = useState<AgentMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Build agent context
  const userDiaries = typeof window !== "undefined" ? loadDiaries() : [];
  const allDiaries = [...userDiaries, ...MOCK_DIARIES];
  const ids = new Set<string>();
  const uniqueDiaries = allDiaries.filter((d) => {
    if (ids.has(d.id)) return false;
    ids.add(d.id);
    return true;
  });

  const {
    messages: chatMessages,
    streaming: chatStreaming,
    pendingIntent,
    error: chatError,
    send: sendChat,
    dismissIntent,
    reset: resetChat,
  } = useAgentStream({
    endpoint: "/api/agent/coach",
    context: {
      profile: profile ?? undefined,
      diaries: uniqueDiaries,
      cityData: CITY_DATA,
      kitProgress,
      kitData: kitData ?? undefined,
    },
    initialMessages,
    onMessagesChange: (msgs) => {
      if (sessionId) {
        saveSession({
          id: sessionId,
          agentType: "coach",
          messages: msgs,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    },
  });

  useEffect(() => {
    const p = loadUserProfile();
    setProfile(p);
    const cached = loadCachedKit();
    if (cached) {
      try {
        setKitData(JSON.parse(cached));
      } catch { /* ignore parse error */ }
    }
    setKitProgress(loadKitProgress());

    // Restore saved chat session
    const existingSessions = JSON.parse(
      localStorage.getItem("cultur-ease-agent-sessions") ?? "[]"
    );
    const coachSession = existingSessions.find(
      (s: { agentType: string }) => s.agentType === "coach"
    );
    if (coachSession) {
      setSessionId(coachSession.id);
      setInitialMessages(coachSession.messages ?? []);
    } else {
      setSessionId(generateSessionId());
    }
  }, []);

  // Handle ?simulate=xxx query param — enter simulate mode directly (only on mount)
  const initialScenarioRef = useRef<string | null>(null);
  if (!initialScenarioRef.current && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    initialScenarioRef.current = params.get("simulate");
  }
  useEffect(() => {
    if (initialScenarioRef.current) {
      setMode("simulate");
      setSimScenario(initialScenarioRef.current);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [report]);

  // Auto-handle kit-toggle intents — silently toggle and dismiss
  useEffect(() => {
    if (pendingIntent?.type === "kit-toggle" && pendingIntent.param) {
      const key = pendingIntent.param;
      setKitProgress((prev) => {
        const next = { ...prev, [key]: true };
        saveKitProgress(next);
        return next;
      });
      dismissIntent();
    }
  }, [pendingIntent, dismissIntent]);

  const handleReport = async () => {
    if (loading) return;
    setLoading(true);
    setReport(null);

    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCountry: profile?.sourceCountry || "CN",
          targetCountry: profile?.targetCountry || "GB",
          targetCity: profile?.targetCity || "",
          stage: profile?.stage || "pre-departure",
          ...getApiConfigParams(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      } else {
        setReport("无法生成报告，请检查 API 配置后再试。");
      }
    } catch {
      setReport("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToScenarios = () => {
    setSimScenario(null);
  };

  const handleNewChat = () => {
    resetChat();
    const newId = generateSessionId();
    setSessionId(newId);
    // Clear saved session for coach
    const sessions = JSON.parse(
      localStorage.getItem("cultur-ease-agent-sessions") ?? "[]"
    ).filter((s: { agentType: string }) => s.agentType !== "coach");
    localStorage.setItem("cultur-ease-agent-sessions", JSON.stringify(sessions));
  };

  const handleIntentAction = () => {
    if (!pendingIntent) return;
    const { type, param } = pendingIntent;
    dismissIntent();

    switch (type) {
      case "simulate":
        setMode("simulate");
        if (param) setSimScenario(param);
        break;
      case "analyze":
        router.push("/");
        break;
      case "kit-check":
      case "kit-generate":
        router.push("/survival-kit");
        break;
    }
  };

  const intentLabels: Record<string, { title: string; action: string }> = {
    simulate: { title: "要不要在场景模拟中练习一下？", action: "开始练习" },
    analyze: { title: "想看看你的文化适应分析报告吗？", action: "查看报告" },
    "kit-check": { title: "想检查一下生存清单的准备情况吗？", action: "去看看" },
    "kit-generate": { title: "需要生成一份个性化的生存清单吗？", action: "去生成" },
  };

  const targetLabel = profile
    ? `${profile.targetCity}`
    : "你的目的地";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-ink mb-2">
            AI 文化导师
          </h1>
          <p className="text-slate">
            你的专属留学文化向导 —— 关注{targetLabel}，从真实经验中学习
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 border-b border-cream pb-1">
          {[
            { id: "report" as const, label: "生成报告", desc: "获得个性化的文化适应评估" },
            { id: "chat" as const, label: "AI 对话", desc: "智能导师回答你的留学疑问" },
            { id: "simulate" as const, label: "场景模拟", desc: "预演留学生活的关键对话" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                setReport(null);
                setSimScenario(null);
                if (m.id === "report") {
                  handleReport();
                }
              }}
              className={`flex-1 p-4 rounded-lg text-left transition-colors ${
                mode === m.id
                  ? "bg-white shadow-card border border-cream/50 text-ink"
                  : "text-slate hover:bg-cream/40"
              }`}
            >
              <div className="font-medium text-sm">{m.label}</div>
              <div className="text-xs text-slate mt-0.5">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="min-h-[400px] flex flex-col">
          {mode === "report" && (
            <div className="flex-1 p-6">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <div className="inline-block w-6 h-6 border-2 border-cream border-t-terracotta rounded-full animate-spin mb-3" />
                    <p className="text-sm text-slate">正在生成个性化报告...</p>
                  </div>
                </div>
              )}

              {report && !loading && (
                <div className="whitespace-pre-wrap text-sm text-slate leading-relaxed">
                  {report}
                </div>
              )}

              {!report && !loading && (
                <div className="text-center py-16 text-slate">
                  <p className="font-medium">生成你的个性化文化适应报告</p>
                  <p className="text-sm mt-1">基于你的目的地和个人情况定制</p>
                  <button
                    onClick={handleReport}
                    className="mt-4 px-6 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
                  >
                    开始生成
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "chat" && (
            <div className="flex-1 flex flex-col h-[65vh]">
              {/* Chat header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate">
                  {chatMessages.length > 0 ? `${chatMessages.length} 条消息` : ""}
                </span>
                {chatMessages.length > 0 && (
                  <button
                    onClick={handleNewChat}
                    className="text-xs px-3 py-1 rounded-full border border-cream text-slate hover:bg-cream/60 hover:text-ink transition-colors"
                  >
                    新对话
                  </button>
                )}
              </div>

              {/* Chat messages */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
                {chatMessages.length === 0 && !chatStreaming && (
                  <div className="text-center py-16 text-slate">
                    <p className="font-medium text-lg mb-1">你好！我是你的 AI 文化导师</p>
                    <p className="text-sm">
                      关于{profile?.targetCity ?? "你的目的地"}的留学生活，有什么想问的？
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[
                        `${profile?.targetCity ?? ""}租房贵吗？`,
                        "怎么融入当地社交圈？",
                        "看病流程是什么？",
                      ]
                        .filter((q) => q.length > 1)
                        .map((q) => (
                          <button
                            key={q}
                            onClick={() => {
                              setChatInput(q);
                            }}
                            className="px-3 py-1.5 text-xs rounded-full border border-cream text-slate hover:bg-cream/60 hover:text-ink transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${
                      msg.role === "assistant" ? "min-w-0" : ""
                    }`}>
                      <div
                        className={`rounded-card px-4 py-3 text-sm leading-relaxed break-words overflow-hidden ${
                          msg.role === "user"
                            ? "bg-terracotta/10 text-ink whitespace-pre-wrap"
                            : "bg-white border border-cream/50 text-slate shadow-sm"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {chatStreaming && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-cream/50 rounded-card px-4 py-3 shadow-sm max-w-[80%]">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-slate/30 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-slate/30 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <span className="w-2 h-2 bg-slate/30 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-3 rounded-lg bg-rust/5 border border-rust/20 text-rust text-xs">
                    {chatError}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Intent prompt card */}
              <AnimatePresence>
                {pendingIntent && pendingIntent.type !== "kit-toggle" && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="mx-1 p-4 rounded-xl bg-navy/5 border border-navy/20"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">💡</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {intentLabels[pendingIntent.type]?.title ?? "要试试这个功能吗？"}
                        </p>
                        <p className="text-xs text-slate mt-1">
                          导师觉得这个功能可能对你有帮助
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleIntentAction}
                            className="px-4 py-2 text-xs font-medium rounded-lg bg-navy text-white hover:bg-navy/90 transition-colors"
                          >
                            {intentLabels[pendingIntent.type]?.action ?? "去看看"}
                          </button>
                          <button
                            onClick={dismissIntent}
                            className="px-4 py-2 text-xs rounded-lg border border-cream text-slate hover:bg-cream/60 transition-colors"
                          >
                            暂时不用
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat input */}
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && chatInput.trim()) {
                      sendChat(chatInput.trim());
                      setChatInput("");
                    }
                  }}
                  placeholder="输入你的问题..."
                  disabled={chatStreaming}
                  className="flex-1 px-4 py-3 text-sm rounded-xl border border-cream bg-white text-ink placeholder:text-slate/50 focus:outline-none focus:border-terracotta transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => {
                    if (chatInput.trim()) {
                      sendChat(chatInput.trim());
                      setChatInput("");
                    }
                  }}
                  disabled={!chatInput.trim() || chatStreaming}
                  className="px-5 py-3 text-sm rounded-xl bg-navy text-white font-medium hover:bg-navy/90 transition-colors disabled:opacity-50"
                >
                  发送
                </button>
              </div>
            </div>
          )}

          {mode === "simulate" && (
            <div className="flex-1">
              {simScenario ? (
                <div className="p-4 sm:p-6">
                  <SimChat scenario={simScenario} onBack={handleBackToScenarios} />
                </div>
              ) : (
                <div className="p-4 sm:p-6">
                  <ScenarioSelector onSelect={setSimScenario} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Knowledge Quiz */}
        {profile && (
          <QuizSection
            sourceCountry={profile.sourceCountry}
            targetCountry={profile.targetCountry}
            targetCity={profile.targetCity}
            stage={profile.stage}
          />
        )}
      </motion.div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-slate">Loading...</div>
      </div>
    }>
      <CoachContent />
    </Suspense>
  );
}
