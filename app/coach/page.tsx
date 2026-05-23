"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { loadUserProfile } from "@/lib/storage";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { SimChat } from "@/components/simulator/SimChat";
import { ScenarioSelector } from "@/components/simulator/ScenarioSelector";

type Mode = "report" | "simulate";

function CoachContent() {
  const searchParams = useSearchParams();
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadUserProfile();
    setProfile(p);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [report]);

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
