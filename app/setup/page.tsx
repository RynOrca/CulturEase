"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { saveUserProfile } from "@/lib/storage";
import { getAvailableProviders } from "@/lib/ai/providers";
import { saveApiConfig } from "@/lib/ai/config-loader";
import type { AIProvider } from "@/lib/ai/providers";

const SOURCE_COUNTRIES = [
  { code: "CN", label: "中国" },
  { code: "TW", label: "中国台湾" },
  { code: "HK", label: "中国香港" },
  { code: "MO", label: "中国澳门" },
  { code: "IN", label: "印度" },
  { code: "KR", label: "韩国" },
  { code: "JP", label: "日本" },
  { code: "VN", label: "越南" },
  { code: "TH", label: "泰国" },
  { code: "MY", label: "马来西亚" },
  { code: "ID", label: "印度尼西亚" },
  { code: "PH", label: "菲律宾" },
  { code: "SG", label: "新加坡" },
];

const TARGET_COUNTRIES = [
  { code: "GB", label: "英国" },
  { code: "US", label: "美国" },
  { code: "AU", label: "澳大利亚" },
  { code: "CA", label: "加拿大" },
  { code: "JP", label: "日本" },
  { code: "KR", label: "韩国" },
  { code: "DE", label: "德国" },
  { code: "FR", label: "法国" },
  { code: "SG", label: "新加坡" },
];

const STAGES = [
  { code: "pre-departure", label: "出发前 — 还在准备" },
  { code: "week-1", label: "第 1 周 — 刚到" },
  { code: "month-1", label: "第 1 个月 — 正在适应" },
  { code: "month-3", label: "第 3 个月 — 逐渐习惯" },
  { code: "year-1", label: "第 1 年 — 老司机" },
];

const CITY_SUGGESTIONS: Record<string, string[]> = {
  GB: ["London", "Manchester", "Edinburgh", "Birmingham", "Glasgow"],
  US: ["New York", "Los Angeles", "Boston", "San Francisco", "Chicago", "Seattle", "Austin"],
  AU: ["Sydney", "Melbourne", "Brisbane"],
  CA: ["Toronto", "Vancouver", "Montreal"],
  JP: ["Tokyo", "Osaka"],
  KR: ["Seoul"],
  DE: ["Berlin", "Munich"],
  FR: ["Paris"],
  SG: ["Singapore"],
};

const PROVIDER_OPTIONS: { code: AIProvider; label: string; defaultBaseUrl: string }[] = [
  { code: "deepseek", label: "DeepSeek（默认）", defaultBaseUrl: "https://api.deepseek.com" },
  { code: "openai", label: "OpenAI", defaultBaseUrl: "https://api.openai.com" },
  { code: "anthropic", label: "Anthropic", defaultBaseUrl: "https://api.anthropic.com" },
];

const STEP_LABELS = ["来源地", "目标国", "城市与阶段", "API 配置", "初始化"];

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState("CN");
  const [target, setTarget] = useState("GB");
  const [city, setCity] = useState("");
  const [stage, setStage] = useState("pre-departure");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // API config state
  const [aiProvider, setAiProvider] = useState<AIProvider>("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.deepseek.com");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message: string } | null>(null);

  const cities = CITY_SUGGESTIONS[target] || [];
  const hasServerKey = getAvailableProviders().some((p) => p.configured);
  const canProceed = step < 2 || (step === 2 && city);
  const selectedCountryName = TARGET_COUNTRIES.find((c) => c.code === target)?.label ?? target;

  const handleNext = () => {
    if (step === 4) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setValidationResult({ valid: false, message: "请先输入 API Key" });
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch("/api/ai/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: aiProvider, apiKey, apiBaseUrl }),
      });
      const data = await res.json();
      setValidationResult(data);
    } catch {
      setValidationResult({ valid: false, message: "网络错误，无法验证" });
    }
    setValidating(false);
  };

  const completeSetup = async () => {
    const finalCity = city || cities[0];
    if (!finalCity) return;

    saveUserProfile({
      sourceCountry: source,
      targetCountry: target,
      targetCity: finalCity,
      stage,
    });

    // Save API config if provided
    if (apiKey.trim()) {
      saveApiConfig({ provider: aiProvider, apiKey: apiKey.trim(), apiBaseUrl });
    }

    // Try to generate survival kit on setup
    if (apiKey.trim() || hasServerKey) {
      setLoading(true);
      setLoadingText("正在为你生成个性化内容...");
      try {
        const res = await fetch("/api/ai/survival-kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceCountry: source,
            targetCountry: target,
            targetCity: finalCity,
            stage,
            ...(apiKey.trim() ? { apiKey: apiKey.trim(), apiBaseUrl, provider: aiProvider } : {}),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.kit) {
            const { saveCachedKit } = await import("@/lib/storage");
            saveCachedKit(JSON.stringify(data.kit));
          }
        }
      } catch {
        // Non-critical
      }
    }

    router.push("/");
  };

  const handleProviderChange = (code: AIProvider) => {
    setAiProvider(code);
    const provider = PROVIDER_OPTIONS.find((p) => p.code === code);
    if (provider) {
      setApiBaseUrl(provider.defaultBaseUrl);
    }
    setValidationResult(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-1 rounded-full transition-colors ${
                  i <= step ? "bg-terracotta" : "bg-cream"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  i === step ? "text-terracotta" : i < step ? "text-slate/50" : "text-slate/30"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-ink mb-2">你从哪里出发？</h1>
                <p className="text-slate text-sm mb-6">你的文化背景是我们为你定制建议的基础</p>
                <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
                  {SOURCE_COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setSource(c.code); handleNext(); }}
                      className={`px-3 py-3 text-sm rounded-card border-2 transition-all ${
                        source === c.code
                          ? "border-terracotta bg-terracotta/5 text-terracotta font-medium shadow-sm"
                          : "border-cream hover:border-terracotta/40 text-slate bg-white"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-ink mb-2">你要去哪里留学？</h1>
                <p className="text-slate text-sm mb-6">选择你的目的地国家</p>
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  {TARGET_COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setTarget(c.code); setCity(""); handleNext(); }}
                      className={`px-3 py-4 text-sm rounded-card border-2 transition-all ${
                        target === c.code
                          ? "border-terracotta bg-terracotta/5 text-terracotta font-medium shadow-sm"
                          : "border-cream hover:border-terracotta/40 text-slate bg-white"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <button onClick={handleBack} className="mt-6 text-sm text-slate hover:text-ink underline">
                  返回上一步
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-ink mb-2">选择城市和阶段</h1>
                <p className="text-slate text-sm mb-2">你将在 {selectedCountryName} 的哪个城市？</p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {cities.length > 0 ? cities.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCity(c)}
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
                        city === c
                          ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                          : "border-cream hover:border-terracotta/40 text-slate bg-white"
                      }`}
                    >
                      {c}
                    </button>
                  )) : (
                    <p className="text-sm text-slate">暂无推荐城市</p>
                  )}
                </div>

                <p className="text-slate text-sm mb-3">你目前处于哪个阶段？</p>
                <div className="space-y-2 max-w-sm mx-auto mb-6">
                  {STAGES.map((s) => (
                    <button
                      key={s.code}
                      onClick={() => setStage(s.code)}
                      className={`w-full text-left px-4 py-3 text-sm rounded-lg border-2 transition-all ${
                        stage === s.code
                          ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                          : "border-cream hover:border-terracotta/40 text-slate bg-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 justify-center">
                  <button onClick={handleBack} className="px-4 py-2 text-sm text-slate hover:text-ink underline">
                    返回上一步
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canProceed}
                    className={`px-6 py-2.5 text-sm rounded-lg font-medium transition-all ${
                      canProceed
                        ? "bg-navy text-white hover:bg-navy/90"
                        : "bg-cream text-slate/40 cursor-not-allowed"
                    }`}
                  >
                    继续
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold text-ink mb-2">配置 AI 服务（可选）</h1>
                <p className="text-slate text-sm mb-6 max-w-md mx-auto">
                  CulturEase 使用 AI 驱动所有核心功能。输入你的 API Key 即可启用。
                  {hasServerKey && (
                    <span className="block mt-2 text-sage">系统已检测到服务端配置的 API Key。</span>
                  )}
                </p>

                {/* Provider selector */}
                <div className="flex gap-2 mb-5 justify-center">
                  {PROVIDER_OPTIONS.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => handleProviderChange(p.code)}
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
                        aiProvider === p.code
                          ? "border-terracotta bg-terracotta/5 text-terracotta font-medium"
                          : "border-cream hover:border-terracotta/40 text-slate bg-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* API Key input */}
                <div className="space-y-3 max-w-sm mx-auto mb-5 text-left">
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => { setApiKey(e.target.value); setValidationResult(null); }}
                      placeholder="sk-..."
                      className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">Base URL</label>
                    <input
                      type="text"
                      value={apiBaseUrl}
                      onChange={(e) => { setApiBaseUrl(e.target.value); setValidationResult(null); }}
                      placeholder="https://api.deepseek.com"
                      className="w-full px-4 py-2.5 text-sm rounded-lg border border-cream bg-white text-ink placeholder:text-slate/40 focus:outline-none focus:border-terracotta transition-colors"
                    />
                  </div>

                  {/* Test connection */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTestConnection}
                      disabled={validating || !apiKey.trim()}
                      className="px-4 py-2 text-xs rounded-lg border border-cream text-slate hover:bg-cream/60 transition-colors disabled:opacity-50"
                    >
                      {validating ? "验证中..." : "测试连接"}
                    </button>
                    {validationResult && (
                      <span className={`text-xs ${validationResult.valid ? "text-sage" : "text-rust"}`}>
                        {validationResult.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status indicator */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ${
                  hasServerKey || apiKey.trim() ? "bg-sage/10 text-sage" : "bg-amber/10 text-amber"
                }`}>
                  <span className={`w-2 h-2 rounded-full ${hasServerKey || apiKey.trim() ? "bg-sage" : "bg-amber"}`} />
                  {hasServerKey ? "AI 服务已配置（服务器）" : apiKey.trim() ? "API Key 已填写" : "未配置 API Key"}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (apiKey.trim()) {
                        saveApiConfig({ provider: aiProvider, apiKey: apiKey.trim(), apiBaseUrl });
                      }
                      handleNext();
                    }}
                    className="w-full max-w-sm px-6 py-2.5 text-sm rounded-lg bg-navy text-white font-medium hover:bg-navy/90 transition-colors"
                  >
                    保存并继续
                  </button>
                </div>
                <div className="mt-4">
                  <button onClick={handleBack} className="text-sm text-slate hover:text-ink underline">
                    返回上一步
                  </button>
                  <button
                    onClick={completeSetup}
                    className="ml-4 text-sm text-slate hover:text-ink underline"
                  >
                    跳过，直接开始
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center mb-8">
                {loading ? (
                  <div className="py-8">
                    <div className="inline-block w-12 h-12 border-4 border-cream border-t-terracotta rounded-full animate-spin mb-6" />
                    <p className="text-slate text-sm">{loadingText}</p>
                    <p className="text-slate/50 text-xs mt-2">正在为你生成个性化生存工具包</p>
                  </div>
                ) : (
                  <>
                    <h1 className="font-display text-2xl font-bold text-ink mb-2">准备好了</h1>
                    <p className="text-slate text-sm mb-6 max-w-sm mx-auto">
                      你的留学文化导航已经配置完成。我们准备了个性化内容，点击下方按钮开始探索。
                    </p>
                    <div className="space-y-3 max-w-sm mx-auto mb-6">
                      <div className="p-3 rounded-lg bg-cream/60 text-left">
                        <span className="text-sm font-medium text-ink">目标</span>
                        <p className="text-xs text-slate mt-0.5">{selectedCountryName} · {city || cities[0]}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-cream/60 text-left">
                        <span className="text-sm font-medium text-ink">当前阶段</span>
                        <p className="text-xs text-slate mt-0.5">{STAGES.find((s) => s.code === stage)?.label}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-cream/60 text-left">
                        <span className="text-sm font-medium text-ink">AI 服务</span>
                        <p className="text-xs text-slate mt-0.5">
                          {hasServerKey || apiKey.trim() ? "已配置" : "未配置，可在设置中补充"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={completeSetup}
                      className="mt-4 px-8 py-3 text-base rounded-lg bg-terracotta text-white font-medium hover:bg-terracotta/90 transition-colors shadow-sm"
                    >
                      开始探索
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
