"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiaryEntry } from "@/lib/types";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { DiaryCard } from "@/components/diary/DiaryCard";

interface ExternalResult {
  title: string;
  snippet: string;
  url: string;
  platform: string;
  platformLabel: string;
  platformColor: string;
}

interface Props {
  targetCity: string;
  targetCountry: string;
  stage: string;
  sourceCountry: string;
  onSearchActive?: (active: boolean) => void;
}

const PLATFORM_ICONS: Record<string, string> = {
  bilibili: "M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a.63.63 0 010-.913.66.66 0 01.914 0l2.213 2.033h8.88l2.213-2.033a.66.66 0 01.914 0 .63.63 0 010 .913L17.813 4.653zM7.6 10.2a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4zm8.8 0a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z",
  zhihu: "M13.276 6.548h5.478v1.255H13.99v3.664h4.386v1.255h-4.386v4.387h-.667l-4.72-7.14-3.493 7.14h-.773l3.64-7.354-3.906-6.323h.72l4.373 6.831 4.133-6.831h.722l-1.427 2.282h3.587v1.254h-3.907l-.007.002-.008-.002v3.536h5.106z",
  xiaohongshu: "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 5.5a1 1 0 110 2 1 1 0 010-2zm-7 0a1 1 0 110 2 1 1 0 010-2zm3.5 10a5.5 5.5 0 110-11 5.5 5.5 0 010 11z",
};

export function GlobalSearch({ targetCity, targetCountry, stage, sourceCountry, onSearchActive }: Props) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [externalResults, setExternalResults] = useState<ExternalResult[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;

    setSearching(true);
    setError("");
    setExternalResults([]);
    setSearched(true);
    onSearchActive?.(true);

    // Run AI search and external search in parallel
    const [aiRes, extRes] = await Promise.allSettled([
      fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          targetCity,
          targetCountry,
          stage,
          sourceCountry,
          ...getApiConfigParams(),
        }),
      }),
      fetch("/api/ai/external-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, targetCity, ...getApiConfigParams() }),
      }),
    ]);

    // Process AI search results
    if (aiRes.status === "fulfilled") {
      const res = aiRes.value;
      try {
        const data = await res.json();
        if (res.ok) {
          setAiSummary(data.summary);
          setDiaries(data.diaries || []);
        } else if (res.status === 503) {
          setAiSummary(data.summary || "AI 服务未配置。请在设置中配置 API Key。");
          setDiaries([]);
        } else {
          setAiSummary(null);
          setError("搜索暂时不可用，请稍后重试");
        }
      } catch {
        setError("解析搜索结果失败");
      }
    } else {
      setAiSummary(null);
      setError("网络错误，请检查连接");
    }

    // Process external search results
    if (extRes.status === "fulfilled") {
      const res = extRes.value;
      try {
        const data = await res.json();
        if (res.ok && data.results) {
          setExternalResults(data.results);
        }
      } catch { /* silent */ }
    }

    setSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleReset = () => {
    setQuery("");
    setSearched(false);
    setAiSummary(null);
    setDiaries([]);
    setExternalResults([]);
    setShowSummary(true);
    setError("");
    onSearchActive?.(false);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      {/* Search bar */}
      <motion.div
        layout
        className={searched ? "mb-4" : "mb-0"}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.div
          layout
          className={`flex items-center gap-3 ${
            searched
              ? ""
              : "flex-col sm:flex-row justify-center py-8 sm:py-12"
          }`}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className={searched ? "w-full" : "w-full max-w-2xl"}>
            <motion.div layout className="relative">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`搜索 "${targetCity}" 的留学生活、美食、交通...或直接提问`}
                className={`w-full px-5 py-3.5 text-sm rounded-xl border-2 border-cream bg-white text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta transition-colors ${
                  searched ? "pr-24" : "pr-28 text-base text-center sm:text-left"
                }`}
                disabled={searching}
              />
              <div className={`absolute inset-y-0 flex items-center gap-2 ${
                searched ? "right-2" : "right-3"
              }`}>
                {searched && (
                  <button
                    onClick={handleReset}
                    className="p-1.5 rounded-lg hover:bg-cream/60 text-slate hover:text-ink transition-colors"
                    title="关闭搜索"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || searching}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-navy text-white hover:bg-navy/90 disabled:opacity-40 transition-colors"
                >
                  {searching ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      搜索中
                    </span>
                  ) : (
                    "搜索"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Search results */}
      <AnimatePresence>
        {searched && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* AI Summary */}
            {(aiSummary || searching) && (
              <div className="bg-white rounded-card shadow-card border border-cream/50 overflow-hidden">
                <button
                  onClick={() => setShowSummary(!showSummary)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-cream/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-terracotta">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <span className="text-sm font-medium text-ink">AI 搜索结果</span>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-slate transition-transform ${showSummary ? "rotate-180" : ""}`}
                  >
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
                      <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap">
                        {aiSummary}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-4 rounded-lg bg-rust/5 border border-rust/20 text-rust text-sm">
                {error}
              </div>
            )}

            {/* Diary results */}
            {diaries.length > 0 && (
              <div>
                <h3 className="font-display text-base font-semibold text-ink mb-3">
                  相关经验分享
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {diaries.map((diary, i) => (
                    <motion.div
                      key={diary.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <DiaryCard diary={diary} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* External platform results */}
            {externalResults.length > 0 && (
              <div>
                <h3 className="font-display text-base font-semibold text-ink mb-3">
                  外部平台相关内容
                </h3>
                <div className="space-y-2.5">
                  {externalResults.map((item, i) => (
                    <motion.a
                      key={`${item.platform}-${i}`}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-4 p-4 bg-white rounded-card border border-cream/50 hover:shadow-card hover:border-cream transition-all group"
                    >
                      {/* Platform badge */}
                      <span
                        className="shrink-0 mt-0.5 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: item.platformColor }}
                      >
                        {item.platformLabel}
                      </span>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-ink leading-snug group-hover:text-terracotta transition-colors line-clamp-1">
                          {item.title}
                        </h4>
                        {item.snippet && (
                          <p className="text-xs text-slate/70 mt-1 line-clamp-2 leading-relaxed">
                            {item.snippet}
                          </p>
                        )}
                      </div>
                      {/* Search icon */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className="shrink-0 mt-1 text-slate/30 group-hover:text-terracotta transition-colors">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                      </svg>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* Loading indicator for external */}
            {searching && searched && (
              <div className="space-y-2.5">
                <h3 className="font-display text-base font-semibold text-ink mb-3">
                  外部平台相关内容
                </h3>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-white rounded-card border border-cream/50 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-5 rounded-full bg-cream" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-cream rounded w-3/4" />
                        <div className="h-2.5 bg-cream rounded w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!aiSummary && !searching && diaries.length === 0 && externalResults.length === 0 && !error && (
              <div className="text-center py-8 text-slate text-sm">
                没有找到相关结果，试试其他关键词 (^_^)
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
