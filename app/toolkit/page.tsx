"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { loadUserProfile, loadCachedCulturalScenarios, saveCachedCulturalScenarios } from "@/lib/storage";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { LIFE_TYPE_LABELS, LifeType, CulturalScenario } from "@/lib/types";
import { HolidaySection } from "@/components/toolkit/HolidaySection";

const INITIAL_SHOW_COUNT = 5;

export default function ToolkitPage() {
  const [profile, setProfile] = useState<{
    sourceCountry: string;
    targetCountry: string;
    targetCity: string;
    stage: string;
  } | null>(null);
  const [scenarios, setScenarios] = useState<CulturalScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [generated, setGenerated] = useState(false);
  const [showCount, setShowCount] = useState(INITIAL_SHOW_COUNT);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const p = loadUserProfile();
    setProfile(p);
    if (!p) { setLoading(false); return; }

    // Try loading from cache
    const cached = loadCachedCulturalScenarios();
    if (cached && cached.sourceCountry === p.sourceCountry && cached.targetCountry === p.targetCountry && cached.targetCity === p.targetCity) {
      setScenarios(cached.scenarios);
      setGenerated(true);
      setLoading(false);
    } else {
      // No valid cache → auto-generate
      setLoading(true);
      generateScenarios(p, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateScenarios = useCallback(async (profileOverride?: typeof profile, silent?: boolean) => {
    const p = profileOverride || profile;
    if (!p) return;

    if (!silent) setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/cultural-scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceCountry: p.sourceCountry,
          targetCountry: p.targetCountry,
          targetCity: p.targetCity,
          stage: p.stage,
          ...getApiConfigParams(),
        }),
      });

      if (res.status === 503) {
        setError("AI 服务未配置。请在设置中配置 API Key。");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("生成场景失败，请稍后重试");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data?.scenarios && data.scenarios.length > 0) {
        setScenarios(data.scenarios);
        setGenerated(true);
        setShowCount(INITIAL_SHOW_COUNT);
        setExpandedId(null);
        setSelectedCategory("all");
        // Persist to cache
        saveCachedCulturalScenarios({
          scenarios: data.scenarios,
          sourceCountry: p.sourceCountry,
          targetCountry: p.targetCountry,
          targetCity: p.targetCity,
        });
      } else {
        setError("未能生成有效的场景数据，请重试");
      }
    } catch {
      setError("网络错误，请检查连接");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const handleRegenerate = () => {
    generateScenarios(undefined, false);
  };

  // Collect categories from generated scenarios
  const categories = Array.from(new Set(scenarios.map((s) => s.category)));

  const filtered = scenarios.filter((s) => {
    if (selectedCategory !== "all" && s.category !== selectedCategory)
      return false;
    return true;
  });

  const visibleScenarios = filtered.slice(0, showCount);
  const hasMore = showCount < filtered.length;
  const allShown = filtered.length > 0 && showCount >= filtered.length;

  const targetLabel = profile
    ? `${profile.targetCity || ""} · ${({ GB: "英国", US: "美国", AU: "澳大利亚", CA: "加拿大", JP: "日本", KR: "韩国", DE: "德国", FR: "法国", SG: "新加坡" }[profile.targetCountry] || profile.targetCountry)}`
    : "你的目的地";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-display text-3xl font-bold text-ink mb-2">
          文化差异指南
        </h1>
        <p className="text-slate mb-6">
          不只是"目标国指南"，而是从你的文化背景出发的对比指南
        </p>

        {/* Loading state (initial auto-generate) */}
        {loading && !generated && (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-cream border-t-terracotta rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate">
              AI 正在根据你的目的地生成文化对比场景...
            </p>
          </div>
        )}

        {/* No profile / no API key */}
        {!loading && !generated && !error && (
          <div className="text-center py-16 px-6 bg-gradient-to-br from-navy/5 via-white to-terracotta/5 rounded-card border border-cream/50">
            <div className="text-5xl mb-4">🌏</div>
            <h2 className="font-display text-2xl font-bold text-ink mb-3">
              为你定制文化对比
            </h2>
            <p className="text-sm text-slate max-w-md mx-auto mb-6 leading-relaxed">
              请先在设置中配置 API Key，
              <br />AI 将根据你的出发地和目的地生成专属的文化差异场景对比。
            </p>
            <a
              href="/setup"
              className="inline-block px-6 py-2.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy/90 transition-colors"
            >
              前往设置
            </a>
          </div>
        )}

        {/* Error without any data */}
        {error && !generated && (
          <div className="text-center py-12 px-6 rounded-card border border-rust/20 bg-rust/5">
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
        )}

        {/* Generated scenarios */}
        {generated && scenarios.length > 0 && (
          <>
            {/* Category filter */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-8">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { setSelectedCategory("all"); setShowCount(INITIAL_SHOW_COUNT); setExpandedId(null); }}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === "all"
                      ? "bg-navy text-white"
                      : "bg-white border border-cream text-slate hover:bg-cream/40"
                  }`}
                >
                  全部 ({scenarios.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(cat); setShowCount(INITIAL_SHOW_COUNT); setExpandedId(null); }}
                    className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                      selectedCategory === cat
                        ? "bg-navy text-white"
                        : "bg-white border border-cream text-slate hover:bg-cream/40"
                    }`}
                  >
                    {LIFE_TYPE_LABELS[cat as LifeType] || cat}
                  </button>
                ))}
              </div>
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="text-xs text-terracotta hover:underline shrink-0"
              >
                {loading ? "生成中..." : "重新生成 ↻"}
              </button>
            </div>

            {/* Comparison cards */}
            <div className="space-y-4">
              {visibleScenarios.map((scenario, i) => {
                const isExpanded = expandedId === scenario.id;
                return (
                  <motion.div
                    key={scenario.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-card shadow-card border border-cream/50 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : scenario.id)
                      }
                      className="w-full text-left p-5 hover:bg-cream/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-display text-lg font-semibold text-ink">
                            {scenario.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cream text-slate">
                              {LIFE_TYPE_LABELS[scenario.category]}
                            </span>
                            {scenario.sourceCountry && scenario.targetCountry && (
                              <span className="text-xs text-slate">
                                {scenario.sourceCountry} → {scenario.targetCountry}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`text-slate transition-transform ${
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
                        className="px-5 pb-5 space-y-4"
                      >
                        {/* Comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg bg-cream/40 border border-cream/60">
                            <div className="text-xs font-medium text-slate mb-2 uppercase tracking-wide">
                              {scenario.sourceCountry === "中国" ? "🇨🇳 " : ""}在{scenario.sourceCountry}
                            </div>
                            <p className="text-sm text-ink leading-relaxed">
                              {scenario.sourceBehavior}
                            </p>
                          </div>
                          <div className="p-4 rounded-lg bg-navy/5 border border-navy/10">
                            <div className="text-xs font-medium text-navy mb-2 uppercase tracking-wide">
                              在{scenario.targetCountry}
                            </div>
                            <p className="text-sm text-ink leading-relaxed">
                              {scenario.targetBehavior}
                            </p>
                          </div>
                        </div>

                        {/* How to adapt */}
                        <div className="p-4 rounded-lg border border-sage/20 bg-sage/5">
                          <div className="text-xs font-medium text-sage mb-2 uppercase tracking-wide">
                            怎么应对
                          </div>
                          <p className="text-sm text-ink leading-relaxed">
                            {scenario.howToAdapt}
                          </p>
                        </div>

                        {/* Real quote */}
                        {scenario.realQuote && (
                          <div className="p-4 rounded-lg border-l-3 border-amber bg-cream/40">
                            <div className="text-xs font-medium text-amber mb-2 uppercase tracking-wide">
                              真实经验
                            </div>
                            <p className="text-sm text-ink leading-relaxed italic">
                              "{scenario.realQuote}"
                            </p>
                            {scenario.quoteAuthor && (
                              <p className="text-xs text-slate mt-1">
                                — {scenario.quoteAuthor}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Tags */}
                        {scenario.tags && scenario.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {scenario.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-1 rounded-full bg-cream/60 text-slate"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Load more button */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowCount((c) => c + INITIAL_SHOW_COUNT)}
                  className="px-6 py-2.5 rounded-lg border border-cream bg-white text-slate text-sm font-medium hover:bg-cream/40 transition-colors"
                >
                  展开更多（+{Math.min(INITIAL_SHOW_COUNT, filtered.length - showCount)}）
                </button>
              </div>
            )}

            {/* Bottom message — all shown */}
            {allShown && (
              <div className="mt-8 text-center py-8 border-t border-cream">
                <p className="text-sm text-slate">
                  可以试试在主页询问 AI 哦~
                </p>
              </div>
            )}

            {/* Non-blocking error on regenerate */}
            {error && generated && (
              <div className="mt-4 p-3 rounded-lg bg-rust/5 border border-rust/20 text-rust text-sm text-center">
                {error}
              </div>
            )}
          </>
        )}

        {/* Holiday homesickness relief section */}
        {profile && (
          <div className="mt-10 pt-8 border-t border-cream">
            <HolidaySection
              sourceCountry={profile.sourceCountry}
              targetCountry={profile.targetCountry}
              targetCity={profile.targetCity}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
