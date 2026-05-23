"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DiaryEntry } from "@/lib/types";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { DiaryCard } from "@/components/diary/DiaryCard";

interface Props {
  targetCity: string;
  targetCountry: string;
  stage: string;
  sourceCountry: string;
  onSearchActive?: (active: boolean) => void;
}

export function GlobalSearch({ targetCity, targetCountry, stage, sourceCountry, onSearchActive }: Props) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [showSummary, setShowSummary] = useState(true);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || searching) return;

    setSearching(true);
    setError("");
    setSearched(true);
    onSearchActive?.(true);

    try {
      const res = await fetch("/api/ai/search", {
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
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
        setDiaries(data.diaries || []);
      } else if (res.status === 503) {
        const data = await res.json();
        setAiSummary(data.summary || "AI 服务未配置。请在设置中配置 API Key。");
        setDiaries([]);
      } else {
        setAiSummary(null);
        setError("搜索暂时不可用，请稍后重试");
      }
    } catch {
      setAiSummary(null);
      setError("网络错误，请检查连接");
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

            {/* Placeholder for external platform posts */}
            {searched && !searching && (
              <div className="border border-dashed border-cream rounded-card p-6 text-center">
                <p className="text-sm text-slate/50 mb-2">
                  更多来自其他平台的真实经验即将接入
                </p>
                <p className="text-xs text-slate/30">
                  小红书 · 知乎 · B站 · YouTube 相关内容聚合（规划中）
                </p>
              </div>
            )}

            {!aiSummary && !searching && diaries.length === 0 && !error && (
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
