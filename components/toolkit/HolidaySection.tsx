"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { loadCachedHolidaySuggestions, saveCachedHolidaySuggestions } from "@/lib/storage";

interface HolidayItem {
  name: string;
  season: string;
  whereToBuyIngredients: string;
  localAlternatives: string;
  newConnections: string;
}

interface HolidayData {
  holidays: HolidayItem[];
}

interface Props {
  sourceCountry: string;
  targetCountry: string;
  targetCity: string;
}

export function HolidaySection({ sourceCountry, targetCountry, targetCity }: Props) {
  const [holidayData, setHolidayData] = useState<HolidayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Auto-load from cache or fetch on mount
  useEffect(() => {
    const cached = loadCachedHolidaySuggestions();
    if (cached && cached.sourceCountry === sourceCountry && cached.targetCountry === targetCountry && cached.targetCity === targetCity) {
      setHolidayData({ holidays: cached.holidays });
      setLoading(false);
    } else {
      fetchSuggestions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCountry, targetCountry, targetCity]);

  const fetchSuggestions = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/holiday-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceCountry, targetCountry, targetCity, ...getApiConfigParams() }),
      });

      if (res.status === 503) {
        setError("AI 服务未配置。请在设置中配置 API Key。");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("获取节日建议失败，请稍后重试");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data?.holidays && data.holidays.length > 0) {
        setHolidayData(data);
        setExpandedId(null);
        // Persist to cache
        saveCachedHolidaySuggestions({
          holidays: data.holidays,
          sourceCountry,
          targetCountry,
          targetCity,
        });
      } else {
        setError("未能获取节日建议，请重试");
      }
    } catch {
      setError("网络错误，请检查连接");
    } finally {
      setLoading(false);
    }
  }, [sourceCountry, targetCountry, targetCity]);

  const handleRegenerate = () => {
    fetchSuggestions(false);
  };

  // Loading state (initial auto-fetch)
  if (loading && !holidayData) {
    return (
      <section className="mb-8">
        <div className="text-center py-12 bg-white rounded-card shadow-card border border-cream/50">
          <div className="inline-block w-6 h-6 border-2 border-cream border-t-terracotta rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate">正在为你定制节日指南...</p>
        </div>
      </section>
    );
  }

  // Error state without data (e.g. no API key)
  if (!holidayData && error) {
    return (
      <section className="mb-8">
        <div className="text-center py-12 px-6 bg-gradient-to-br from-amber/5 via-white to-rust/5 rounded-card border border-cream/50">
          <div className="text-5xl mb-4">🏮</div>
          <h2 className="font-display text-2xl font-bold text-ink mb-3">
            此心安处
          </h2>
          <p className="text-sm text-slate max-w-lg mx-auto mb-6 leading-relaxed">
            除夕的饺子、中秋的月饼、冬至的汤圆——这些时刻最是想家。<br />
            不是让你忘记乡愁，而是帮你建立新的联结。
          </p>
          <p className="text-sm text-rust mb-4">{error}</p>
          {error.includes("API Key") ? (
            <a
              href="/setup"
              className="inline-block px-6 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
            >
              前往设置
            </a>
          ) : (
            <button
              onClick={handleRegenerate}
              className="px-6 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      </section>
    );
  }

  // Results
  if (!holidayData) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            🏮 此心安处
          </h2>
          <p className="text-xs text-slate mt-0.5">
            不是让你忘记乡愁，而是帮你建立新的联结
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="text-xs text-terracotta hover:underline shrink-0"
        >
          {loading ? "生成中..." : "重新生成 ↻"}
        </button>
      </div>

      <div className="space-y-3">
        {holidayData.holidays.map((holiday, i) => {
          const isExpanded = expandedId === i;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white rounded-card shadow-card border border-cream/50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : i)}
                className="w-full text-left p-5 hover:bg-cream/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {holiday.name}
                    </h3>
                    <p className="text-xs text-slate mt-0.5">{holiday.season}</p>
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-slate transition-transform shrink-0 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 pb-5 space-y-3"
                >
                  {/* Where to buy ingredients */}
                  <div className="p-4 rounded-lg bg-cream/40 border border-cream/60">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-slate uppercase tracking-wider">
                        家乡味道 · 食材采购
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">
                      {holiday.whereToBuyIngredients}
                    </p>
                  </div>

                  {/* Local alternatives */}
                  <div className="p-4 rounded-lg bg-navy/5 border border-navy/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-navy uppercase tracking-wider">
                        当地替代 · 新的体验
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">
                      {holiday.localAlternatives}
                    </p>
                  </div>

                  {/* New connections */}
                  <div className="p-4 rounded-lg border border-amber/20 bg-amber/5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-amber uppercase tracking-wider">
                        新的联结 · 此心安处
                      </span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">
                      {holiday.newConnections}
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
