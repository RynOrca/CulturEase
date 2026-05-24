"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiaryEntry, SurvivalKit } from "@/lib/types";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { loadDiaries, loadKitProgress, loadCachedKit } from "@/lib/storage";
import { useAgentStream } from "@/lib/agent/useAgent";
import { MOCK_DIARIES, CITY_DATA } from "@/lib/data";
import { DiaryCard } from "@/components/diary/DiaryCard";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

interface ExternalResult {
  title: string;
  snippet: string;
  url: string;
  platform: string;
  platformLabel: string;
  platformColor: string;
}

type InputMode = "agent" | "search";

interface Props {
  targetCity: string;
  targetCountry: string;
  stage: string;
  sourceCountry: string;
  onActiveChange?: (active: boolean) => void;
}

function ModeSelector({ mode, onSwitch }: { mode: InputMode; onSwitch: (m: InputMode) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
          mode === "agent"
            ? "border-navy/20 bg-navy/5 text-navy hover:bg-navy/10"
            : "border-cream bg-cream/40 text-slate hover:bg-cream/60"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {mode === "agent" ? (
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          ) : (
            <><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>
          )}
        </svg>
        <span>{mode === "agent" ? "Agent" : "搜索"}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-50">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-cream/60 overflow-hidden z-50"
          >
            <button
              onClick={() => { onSwitch("agent"); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${
                mode === "agent" ? "bg-navy/5 text-navy font-medium" : "text-slate hover:bg-cream/20"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              Agent
            </button>
            <button
              onClick={() => { onSwitch("search"); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs transition-colors ${
                mode === "search" ? "bg-cream/40 text-ink font-medium" : "text-slate hover:bg-cream/20"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              搜索
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function HomeInput({ targetCity, targetCountry, stage, sourceCountry, onActiveChange }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [mode, setMode] = useState<InputMode>("agent");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Search state ──────────────────────────────────────────────
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [diaryResults, setDiaryResults] = useState<DiaryEntry[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalResult[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [searchError, setSearchError] = useState("");

  // ─── Agent chat state ───────────────────────────────────────────
  const [kitProgress, setKitProgress] = useState<Record<string, boolean>>({});
  const [kitData, setKitData] = useState<SurvivalKit | null>(null);

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
      profile: { sourceCountry, targetCountry, targetCity, stage },
      diaries: uniqueDiaries,
      cityData: CITY_DATA,
      kitProgress,
      kitData: kitData ?? undefined,
    },
    initialMessages: [],
    onMessagesChange: () => {},
  });

  useEffect(() => {
    setKitProgress(loadKitProgress());
    const cached = loadCachedKit();
    if (cached) {
      try { setKitData(JSON.parse(cached) as SurvivalKit); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatStreaming]);

  // ─── Active state ───────────────────────────────────────────────
  const agentActive = mode === "agent" && chatMessages.length > 0;
  const searchActive = mode === "search" && searched;
  const isActive = agentActive || searchActive;

  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  // ─── Search logic ───────────────────────────────────────────────
  const handleSearch = async () => {
    const q = inputValue.trim();
    if (!q || searching) return;

    setSearching(true);
    setSearchError("");
    setExternalResults([]);
    setSearched(true);

    const [aiRes, extRes] = await Promise.allSettled([
      fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, targetCity, targetCountry, stage, sourceCountry, ...getApiConfigParams() }),
      }),
      fetch("/api/ai/external-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, targetCity, ...getApiConfigParams() }),
      }),
    ]);

    if (aiRes.status === "fulfilled") {
      const res = aiRes.value;
      try {
        const data = await res.json();
        if (res.ok) {
          setAiSummary(data.summary);
          setDiaryResults(data.diaries || []);
        } else if (res.status === 503) {
          setAiSummary(data.summary || "AI 服务未配置。请在设置中配置 API Key。");
          setDiaryResults([]);
        } else {
          setAiSummary(null);
          setSearchError("搜索暂时不可用，请稍后重试");
        }
      } catch {
        setSearchError("解析搜索结果失败");
      }
    } else {
      setAiSummary(null);
      setSearchError("网络错误，请检查连接");
    }

    if (extRes.status === "fulfilled") {
      const res = extRes.value;
      try {
        const data = await res.json();
        if (res.ok && data.results) setExternalResults(data.results);
      } catch { /* silent */ }
    }

    setSearching(false);
  };

  // ─── Chat logic ─────────────────────────────────────────────────
  const handleChatSend = () => {
    if (!inputValue.trim() || chatStreaming) return;
    sendChat(inputValue.trim());
    setInputValue("");
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    if (mode === "search") handleSearch();
    else handleChatSend();
  };

  const handleResetSearch = () => {
    setInputValue("");
    setSearched(false);
    setAiSummary(null);
    setDiaryResults([]);
    setExternalResults([]);
    setShowSummary(true);
    setSearchError("");
    inputRef.current?.focus();
  };

  const handleModeSwitch = (newMode: InputMode) => {
    setMode(newMode);
    setInputValue("");
    if (newMode === "search") {
      setSearched(false);
      setAiSummary(null);
      setDiaryResults([]);
      setExternalResults([]);
      setSearchError("");
    }
  };

  // ─── Intent handler ─────────────────────────────────────────────
  const handleIntentAction = () => {
    if (!pendingIntent) return;
    dismissIntent();
    const { type, param } = pendingIntent;

    switch (type) {
      case "simulate":
        window.open(`/coach?simulate=${param ?? ""}`, "_self");
        break;
      case "analyze":
      case "kit-check":
      case "kit-generate":
        window.open("/coach", "_self");
        break;
    }
  };

  const intentLabels: Record<string, { title: string; action: string }> = {
    simulate: { title: "要不要在场景模拟中练习一下？", action: "开始练习" },
    analyze: { title: "想看看你的文化适应分析报告吗？", action: "查看报告" },
    "kit-check": { title: "想检查一下生存清单的准备情况吗？", action: "去看看" },
    "kit-generate": { title: "需要生成一份个性化的生存清单吗？", action: "去生成" },
  };

  // =====================================================================
  //  RENDER
  // =====================================================================

  const showTopBar = mode === "search" || !agentActive;

  return (
    <div className="w-full">
      {/* ─── Top input bar ──────────────────────────────────────── */}
      {showTopBar && (
        <motion.div
          layout
          className={isActive && mode === "search" ? "mb-4" : "mb-0"}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className={`flex items-center gap-3 ${
            isActive && mode === "search" ? "" : "flex-col sm:flex-row justify-center py-8 sm:py-12"
          }`}>
            <div className={isActive && mode === "search" ? "flex-1 flex items-center gap-2" : "w-full max-w-2xl flex items-center gap-2"}>
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  placeholder={
                    mode === "agent"
                      ? `向 AI 导师提问关于 ${targetCity} 留学生活的任何问题...`
                      : `搜索 "${targetCity}" 的留学生活、美食、交通...或直接提问`
                  }
                  className={`w-full px-5 py-3.5 text-sm rounded-xl border-2 bg-white text-ink placeholder:text-slate/40 focus:outline-none transition-colors ${
                    mode === "agent"
                      ? "border-navy/20 focus:border-navy"
                      : "border-cream focus:border-terracotta"
                  } ${isActive && mode === "search" ? "pr-10" : "pr-5 text-base text-center sm:text-left"}`}
                  disabled={searching || chatStreaming}
                />
                {isActive && mode === "search" && (
                  <button
                    onClick={handleResetSearch}
                    className="absolute right-2 inset-y-0 my-auto p-1.5 rounded-lg hover:bg-cream/60 text-slate hover:text-ink transition-colors h-fit"
                    title="重置"
                  >
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || searching || chatStreaming}
                className="px-5 py-3.5 text-sm font-medium rounded-xl bg-navy text-white hover:bg-navy/90 disabled:opacity-40 transition-colors shrink-0"
              >
                {(searching || chatStreaming) ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                ) : mode === "agent" ? "发送" : "搜索"}
              </button>
              <ModeSelector mode={mode} onSwitch={handleModeSwitch} />
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Content area ────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Search results */}
        {isActive && mode === "search" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {(aiSummary || searching) && (
              <div className="bg-white rounded-card shadow-card border border-cream/50 overflow-hidden">
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-cream/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                    <span className="text-sm font-medium text-ink">AI 搜索结果</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-slate transition-transform ${showSummary ? "rotate-180" : ""}`}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {showSummary && (
                  <div className="px-5 pb-4">
                    {searching ? (
                      <div className="flex items-center gap-3 py-4">
                        <span className="w-4 h-4 border-2 border-cream border-t-terracotta rounded-full animate-spin" />
                        <span className="text-sm text-slate">AI 正在搜索...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {searchError && (
              <div className="p-4 rounded-lg bg-rust/5 border border-rust/20 text-rust text-sm">{searchError}</div>
            )}

            {diaryResults.length > 0 && (
              <div>
                <h3 className="font-display text-base font-semibold text-ink mb-3">相关经验分享</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {diaryResults.map((diary, i) => (
                    <motion.div key={diary.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                      <DiaryCard diary={diary} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {externalResults.length > 0 && (
              <div>
                <h3 className="font-display text-base font-semibold text-ink mb-3">外部平台相关内容</h3>
                <div className="space-y-2.5">
                  {externalResults.map((item, i) => (
                    <motion.a
                      key={`${item.platform}-${i}`}
                      href={item.url} target="_blank" rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-4 p-4 bg-white rounded-card border border-cream/50 hover:shadow-card hover:border-cream transition-all group"
                    >
                      <span className="shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: item.platformColor }}>{item.platformLabel}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-ink leading-snug group-hover:text-terracotta transition-colors line-clamp-1">{item.title}</h4>
                        {item.snippet && <p className="text-xs text-slate/70 mt-1 line-clamp-2 leading-relaxed">{item.snippet}</p>}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className="shrink-0 mt-1 text-slate/30 group-hover:text-terracotta transition-colors">
                        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                      </svg>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {!aiSummary && !searching && diaryResults.length === 0 && externalResults.length === 0 && !searchError && (
              <div className="text-center py-8 text-slate text-sm">没有找到相关结果，试试其他关键词 (^_^)</div>
            )}
          </motion.div>
        )}

        {/* Agent chat — only after first message sent */}
        {mode === "agent" && agentActive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-[65vh]"
          >
            {/* Chat header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">AI 对话</span>
                <span className="text-xs text-slate">({chatMessages.length} 条消息)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    resetChat();
                    setInputValue("");
                  }}
                  className="text-xs px-3 py-1 rounded-full border border-cream text-slate hover:bg-cream/60 hover:text-ink transition-colors"
                >
                  新对话
                </button>
                <ModeSelector mode={mode} onSwitch={handleModeSwitch} />
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 min-h-0">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${msg.role === "assistant" ? "min-w-0" : ""}`}>
                    <div className={`rounded-card px-4 py-3 text-sm leading-relaxed break-words overflow-hidden ${
                      msg.role === "user"
                        ? "bg-navy/8 text-ink whitespace-pre-wrap"
                        : "bg-white border border-cream/50 text-slate shadow-sm"
                    }`}>
                      {msg.role === "assistant" ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : (
                        <span className="whitespace-pre-wrap">{msg.content}</span>
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
                <div className="p-3 rounded-lg bg-rust/5 border border-rust/20 text-rust text-xs">{chatError}</div>
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
                  className="p-4 rounded-xl bg-navy/5 border border-navy/20 mb-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">💡</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {intentLabels[pendingIntent.type]?.title ?? "要试试这个功能吗？"}
                      </p>
                      <p className="text-xs text-slate mt-1">导师觉得这个功能可能对你有帮助</p>
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

            {/* Bottom send box — only visible when chat is active */}
            <div className="flex gap-2 pt-4 border-t border-cream shrink-0">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleChatSend(); }}
                placeholder="输入消息..."
                disabled={chatStreaming}
                className="flex-1 px-4 py-3 text-sm rounded-xl border border-cream bg-white text-ink placeholder:text-slate/50 focus:outline-none focus:border-terracotta transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleChatSend}
                disabled={!inputValue.trim() || chatStreaming}
                className="px-5 py-3 text-sm rounded-xl bg-navy text-white font-medium hover:bg-navy/90 transition-colors disabled:opacity-50 shrink-0"
              >
                {chatStreaming ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                ) : "发送"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
