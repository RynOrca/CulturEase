"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { loadUserProfile, loadCachedKit, saveCachedKit, loadKitProgress, saveKitProgress } from "@/lib/storage";
import { getApiConfigParams } from "@/lib/ai/config-loader";
import { ProgressRing } from "./ProgressRing";
import { ChecklistSection } from "./ChecklistSection";
import type { SurvivalKit } from "@/lib/types";

const DEFAULT_KIT: SurvivalKit = {
  sections: [
    { id: "documents", title: "📋 文件清单", items: [{ text: "办理签证", checked: false }, { text: "准备护照复印件", checked: false }] },
    { id: "housing", title: "🏠 住房准备", items: [{ text: "了解当地租房渠道", checked: false }] },
    { id: "healthcare", title: "🏥 医疗配置", items: [{ text: "注册当地医疗", checked: false }] },
    { id: "finance", title: "💰 财务准备", items: [{ text: "开设银行账户", checked: false }] },
    { id: "phrases", title: "🗣️ 文化短语", items: [{ text: "学习基本当地用语", checked: false }] },
    { id: "emergency", title: "🆘 紧急联络", items: [{ text: "保存当地紧急电话", checked: false }] },
  ],
};

export function SurvivalKitMain() {
  const router = useRouter();
  const [kit, setKit] = useState<SurvivalKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const savedProfile = loadUserProfile();
    if (!savedProfile) {
      router.replace("/setup");
      return;
    }
    setProfile(savedProfile);

    const cached = loadCachedKit();
    const savedProgress = loadKitProgress();
    setProgress(savedProgress);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Merge saved progress into kit
        parsed.sections.forEach((section: { id: string; items: { text: string; checked: boolean }[] }) => {
          section.items.forEach((item, i) => {
            const key = `${section.id}-${i}`;
            item.checked = savedProgress[key] ?? false;
          });
        });
        setKit(parsed);
        setLoading(false);
      } catch {
        fetchKit(savedProfile, savedProgress);
      }
    } else {
      fetchKit(savedProfile, savedProgress);
    }
  }, [router]);

  const fetchKit = async (
    p: Record<string, string>,
    savedProgress: Record<string, boolean>,
  ) => {
    try {
      const res = await fetch("/api/ai/survival-kit", {
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
        // API key not configured — use default kit
        setKit(DEFAULT_KIT);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      if (data.kit?.sections) {
        data.kit.sections.forEach((section: { id: string; items: { text: string; checked: boolean }[] }) => {
          section.items.forEach((item, i) => {
            const key = `${section.id}-${i}`;
            item.checked = savedProgress[key] ?? false;
          });
        });
        setKit(data.kit);
        saveCachedKit(JSON.stringify(data.kit));
      } else {
        setKit(DEFAULT_KIT);
      }
    } catch {
      setKit(DEFAULT_KIT);
    }
    setLoading(false);
  };

  const handleToggle = useCallback(
    (sectionIndex: number, itemIndex: number) => {
      if (!kit) return;
      const updated = { ...kit };
      const item = updated.sections[sectionIndex].items[itemIndex];
      item.checked = !item.checked;
      setKit(updated);

      const key = `${updated.sections[sectionIndex].id}-${itemIndex}`;
      const newProgress = { ...progress, [key]: item.checked };
      setProgress(newProgress);
      saveKitProgress(newProgress);
    },
    [kit, progress],
  );

  const totalItems = kit?.sections.reduce((sum, s) => sum + s.items.length, 0) ?? 1;
  const checkedCount = kit?.sections.reduce((sum, s) => sum + s.items.filter((i) => i.checked).length, 0) ?? 0;
  const percent = Math.round((checkedCount / totalItems) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="inline-block w-10 h-10 border-4 border-cream border-t-terracotta rounded-full animate-spin" />
      </div>
    );
  }

  if (!kit || !profile) return null;

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-display text-3xl font-bold text-ink mb-2">文化生存工具包</h1>
        <p className="text-slate">
          针对 {profile.targetCity} · {profile.targetCountry} 的个性化清单
          {profile.stage === "pre-departure" && "（出发前准备）"}
        </p>
      </motion.div>

      {/* Progress overview */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white rounded-card shadow-card border border-cream/50 mb-8"
      >
        <ProgressRing progress={percent} />
        <div>
          <h2 className="font-display text-xl font-semibold text-ink mb-1">
            准备就绪进度
          </h2>
          <p className="text-sm text-slate">
            已完成 {checkedCount}/{totalItems} 项 ·{" "}
            {percent < 30
              ? "刚刚开始，加油！"
              : percent < 70
              ? "不错，继续推进！"
              : percent < 100
              ? "快完成了！"
              : "全部完成，准备出发！ 🎉"}
          </p>
        </div>
      </motion.div>

      {/* Checklist sections */}
      <div className="space-y-4">
        {kit.sections.map((section, si) => (
          <ChecklistSection
            key={section.id}
            section={section}
            onToggle={(ii) => handleToggle(si, ii)}
          />
        ))}
      </div>

      {error && (
        <p className="text-rust text-sm text-center mt-6">{error}</p>
      )}
    </div>
  );
}
