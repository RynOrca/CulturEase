"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { DiaryEntry, CultureShockScores } from "@/lib/types";
import { loadDiaries } from "@/lib/storage";
import { MOCK_DIARIES, CITY_DATA } from "@/lib/data";
import { DiaryCard } from "@/components/diary/DiaryCard";
import { RadarChartView } from "@/components/city/RadarChartView";

export default function CityDetailPage() {
  const params = useParams();
  const slug = (params?.slug as string || "").toLowerCase();
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  const cityEntry = Object.values(CITY_DATA).find(
    (c) => c.name.toLowerCase() === slug
  );

  useEffect(() => {
    setMounted(true);
    const userDiaries = loadDiaries();
    const all = [...userDiaries, ...MOCK_DIARIES];
    const filtered = all.filter(
      (d) => d.city.toLowerCase() === slug
    );
    const ids = new Set<string>();
    const unique = filtered.filter((d) => {
      if (ids.has(d.id)) return false;
      ids.add(d.id);
      return true;
    });
    setDiaries(unique);
  }, [slug]);

  if (!mounted) return null;

  if (!cityEntry) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        
        <h1 className="font-display text-2xl font-bold text-ink mb-2">
          城市未找到
        </h1>
        <p className="text-slate mb-4">
          该城市尚未收录足够的数据
        </p>
        <Link
          href="/explore"
          className="text-terracotta hover:underline font-medium"
        >
          ← 回到全球探索
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-1 text-sm text-slate hover:text-ink mb-4 transition-colors"
        >
          ← 返回全球探索
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink">
              {cityEntry.name}
            </h1>
            <p className="text-slate text-lg">{cityEntry.country}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-navy">{diaries.length}</div>
              <div className="text-xs text-slate">篇经验</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber">
                {diaries.length > 0
                  ? (
                      diaries.reduce((sum, d) => sum + d.rating, 0) /
                      diaries.length
                    ).toFixed(1)
                  : "-"}
              </div>
              <div className="text-xs text-slate">平均评分</div>
            </div>
          </div>
        </div>

        {/* Radar chart + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="p-6 bg-white rounded-card shadow-card border border-cream/50">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">
              文化冲击指数
            </h2>
            <RadarChartView scores={cityEntry.scores} />
          </div>
          <div className="p-6 bg-white rounded-card shadow-card border border-cream/50">
            <h2 className="font-display text-lg font-semibold text-ink mb-4">
              解读
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-slate">
              {cityEntry.scores.housing > 70 && (
                <p>
                  <strong>房租压力较大</strong>——{cityEntry.name}的住宿成本偏高，
                  建议提前规划预算，考虑合租或稍远的街区。
                </p>
              )}
              {cityEntry.scores.language > 50 && (
                <p>
                  <strong>语言有一定障碍</strong>——建议出发前加强语言准备，
                  尤其是日常生活用语和学术用语。
                </p>
              )}
              {cityEntry.scores.safety > 75 && (
                <p>
                  <strong>整体治安良好</strong>——{cityEntry.name}是一个相对安全的城市，
                  但仍需保持基本的安全意识。
                </p>
              )}
              {cityEntry.scores.value > 50 && (
                <p>
                  <strong>性价比尚可</strong>——相比其他留学热门城市，
                  {cityEntry.name}的生活成本在可接受范围内。
                </p>
              )}
              <p className="text-xs text-slate/60 mt-4">
                * 以上数据基于留学生真实评分和AI辅助分析
              </p>
            </div>
          </div>
        </div>

        {/* Diaries */}
        <section>
          <h2 className="font-display text-xl font-semibold text-ink mb-4">
            {cityEntry.name}的留学生经验
          </h2>
          {diaries.length > 0 ? (
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
          ) : (
            <div className="text-center py-12 bg-white rounded-card shadow-card border border-cream/50">
              <p className="text-slate">
                还没有{cityEntry.name}的经验分享
              </p>
              <Link
                href="/share"
                className="text-sm font-medium text-terracotta hover:underline mt-2 inline-block"
              >
                成为第一个分享的人 →
              </Link>
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
