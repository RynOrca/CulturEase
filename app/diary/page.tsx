"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DiaryEntry, LIFE_TYPE_LABELS } from "@/lib/types";
import { loadDiaries } from "@/lib/storage";
import { MOCK_DIARIES } from "@/lib/data";
import { DiaryCard } from "@/components/diary/DiaryCard";

export default function DiaryListPage() {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [filterLifeType, setFilterLifeType] = useState<string>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshDiaries();
  }, []);

  const refreshDiaries = () => {
    const userDiaries = loadDiaries();
    const all = [...userDiaries, ...MOCK_DIARIES];
    const ids = new Set<string>();
    const unique = all.filter((d) => {
      if (ids.has(d.id)) return false;
      ids.add(d.id);
      return true;
    });
    setDiaries(unique);
  };

  const filtered = diaries
    .filter((d) =>
      filterLifeType === "all" ? true : d.lifeType === filterLifeType
    )
    .sort((a, b) => {
      if (sort === "newest") return b.timestamp - a.timestamp;
      return b.likes - a.likes;
    });

  const lifeTypes = Array.from(new Set(diaries.map((d) => d.lifeType)));

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink mb-1">
              日记档案
            </h1>
            <p className="text-slate">
              来自世界各地留学生的真实经验
            </p>
          </div>
          <Link
            href="/share"
            className="px-4 py-2.5 text-sm rounded-lg bg-terracotta text-white font-medium hover:bg-terracotta/90 transition-colors"
          >
            分享我的故事
          </Link>
        </div>

        {/* Sort + Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex rounded-lg border border-cream overflow-hidden">
            <button
              onClick={() => setSort("newest")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                sort === "newest"
                  ? "bg-navy text-white"
                  : "bg-white text-slate hover:bg-cream/40"
              }`}
            >
              最新
            </button>
            <button
              onClick={() => setSort("popular")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                sort === "popular"
                  ? "bg-navy text-white"
                  : "bg-white text-slate hover:bg-cream/40"
              }`}
            >
              最热
            </button>
          </div>
          <select
            value={filterLifeType}
            onChange={(e) => setFilterLifeType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-cream bg-white text-ink focus:outline-none focus:border-terracotta"
          >
            <option value="all">所有类型</option>
            {lifeTypes.map((t) => (
              <option key={t} value={t}>
                {LIFE_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate ml-auto">
            {filtered.length} 篇日记
          </span>
        </div>

        {/* Diary grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((diary, i) => (
              <motion.div
                key={diary.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <DiaryCard diary={diary} onLike={refreshDiaries} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-card shadow-card border border-cream/50">
            <p className="text-slate">还没有符合条件的日记</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
