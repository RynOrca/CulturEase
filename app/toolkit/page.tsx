"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CULTURAL_SCENARIOS } from "@/lib/data";
import { loadUserProfile } from "@/lib/storage";
import { LIFE_TYPE_LABELS, LifeType } from "@/lib/types";

export default function ToolkitPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [profile] = useState(() => {
    if (typeof window !== "undefined") return loadUserProfile();
    return null;
  });

  const categories = Array.from(
    new Set(CULTURAL_SCENARIOS.map((s) => s.category))
  );

  const filtered = CULTURAL_SCENARIOS.filter((s) => {
    if (selectedCategory !== "all" && s.category !== selectedCategory)
      return false;
    // Filter by user's source→target
    if (profile) {
      const sourceMatch =
        s.sourceCountry ===
        (profile.sourceCountry === "CN" ? "中国" : s.sourceCountry);
      const targetMatch =
        s.targetCountry ===
        ({ GB: "英国", US: "美国", AU: "澳大利亚", CA: "加拿大", JP: "日本", KR: "韩国", DE: "德国", FR: "法国", SG: "新加坡" }[
          profile.targetCountry
        ] || s.targetCountry);
      // Show matching cards first, but also show all
    }
    return true;
  });

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

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedCategory === "all"
                ? "bg-navy text-white"
                : "bg-white border border-cream text-slate hover:bg-cream/40"
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
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

        {/* Comparison cards */}
        <div className="space-y-4">
          {filtered.map((scenario, i) => {
            const isExpanded = expandedId === scenario.id;
            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
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
                        <span className="text-xs text-slate">
                          {scenario.sourceCountry} → {scenario.targetCountry}
                        </span>
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
                          🇨🇳 在{scenario.sourceCountry}
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
                        💡 怎么应对
                      </div>
                      <p className="text-sm text-ink leading-relaxed">
                        {scenario.howToAdapt}
                      </p>
                    </div>

                    {/* Real quote */}
                    <div className="p-4 rounded-lg border-l-3 border-amber bg-cream/40">
                      <div className="text-xs font-medium text-amber mb-2 uppercase tracking-wide">
                        📖 真实经验
                      </div>
                      <p className="text-sm text-ink leading-relaxed italic">
                        "{scenario.realQuote}"
                      </p>
                      <p className="text-xs text-slate mt-1">
                        — {scenario.quoteAuthor}
                      </p>
                    </div>

                    {/* Tags */}
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
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
