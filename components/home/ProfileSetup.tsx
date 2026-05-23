"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onSave: (profile: {
    sourceCountry: string;
    targetCountry: string;
    targetCity: string;
    stage: string;
  }) => void;
  onClose: () => void;
}

const SOURCE_COUNTRIES = [
  { code: "CN", label: "🇨🇳 中国" },
  { code: "IN", label: "🇮🇳 印度" },
  { code: "KR", label: "🇰🇷 韩国" },
  { code: "JP", label: "🇯🇵 日本" },
  { code: "Other", label: "其他" },
];

const TARGET_COUNTRIES = [
  { code: "GB", label: "🇬🇧 英国" },
  { code: "US", label: "🇺🇸 美国" },
  { code: "AU", label: "🇦🇺 澳大利亚" },
  { code: "CA", label: "🇨🇦 加拿大" },
  { code: "JP", label: "🇯🇵 日本" },
  { code: "KR", label: "🇰🇷 韩国" },
  { code: "DE", label: "🇩🇪 德国" },
  { code: "FR", label: "🇫🇷 法国" },
  { code: "SG", label: "🇸🇬 新加坡" },
];

const STAGES = [
  { code: "pre-departure", label: "出发前 · 还在准备" },
  { code: "week-1", label: "第1周 · 刚到" },
  { code: "month-1", label: "第1个月 · 正在适应" },
  { code: "month-3", label: "第3个月 · 逐渐习惯" },
  { code: "year-1", label: "第1年 · 老司机" },
];

const CITY_SUGGESTIONS: Record<string, string[]> = {
  GB: ["London", "Manchester", "Edinburgh", "Birmingham", "Glasgow"],
  US: [
    "New York",
    "Los Angeles",
    "Boston",
    "San Francisco",
    "Chicago",
    "Seattle",
    "Austin",
  ],
  AU: ["Sydney", "Melbourne", "Brisbane"],
  CA: ["Toronto", "Vancouver", "Montreal"],
  JP: ["Tokyo", "Osaka"],
  KR: ["Seoul"],
  DE: ["Berlin", "Munich"],
  FR: ["Paris"],
  SG: ["Singapore"],
};

export function ProfileSetup({ onSave, onClose }: Props) {
  const [source, setSource] = useState("CN");
  const [target, setTarget] = useState("GB");
  const [city, setCity] = useState("");
  const [stage, setStage] = useState("pre-departure");

  const cities = CITY_SUGGESTIONS[target] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCity = city || cities[0];
    if (!finalCity) return;
    onSave({
      sourceCountry: source,
      targetCountry: target,
      targetCity: finalCity,
      stage,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-card shadow-panel border border-cream/50 p-6 sm:p-8"
      >
        <div className="text-center mb-6">
          <span className="text-4xl">🌏</span>
          <h2 className="font-display text-2xl font-bold text-ink mt-3">
            定制你的留学导航
          </h2>
          <p className="text-slate text-sm mt-2">
            告诉我们你的背景，让所有内容围绕你重新组织
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Source country */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              你来自哪里？
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SOURCE_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSource(c.code)}
                  className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                    source === c.code
                      ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                      : "border-cream hover:bg-cream/40 text-slate"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target country */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              你要去哪个国家？
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TARGET_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setTarget(c.code);
                    setCity("");
                  }}
                  className={`px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                    target === c.code
                      ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                      : "border-cream hover:bg-cream/40 text-slate"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          {cities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                具体城市（可选）
              </label>
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      city === c
                        ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                        : "border-cream hover:bg-cream/40 text-slate"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              你目前的状态？
            </label>
            <div className="space-y-1">
              {STAGES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setStage(s.code)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg border transition-colors ${
                    stage === s.code
                      ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                      : "border-cream hover:bg-cream/40 text-slate"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-cream text-slate hover:bg-cream/40 transition-colors"
            >
              以后再说
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors"
            >
              开始探索 →
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
