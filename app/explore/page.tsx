"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { DiaryEntry, LIFE_TYPE_LABELS, STAGE_LABELS } from "@/lib/types";
import { loadDiaries, loadUserProfile, likeDiary } from "@/lib/storage";
import { MOCK_DIARIES } from "@/lib/data";
import { getCoords } from "@/lib/data/cities";

const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => ({ default: m.MapView })),
  { ssr: false }
);

function DiaryDetailPanel({ diary, onLike, onClose }: { diary: DiaryEntry; onLike: (id: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-card shadow-card border border-cream/50 p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display text-lg font-semibold text-ink pr-6">{diary.title}</h3>
        <button onClick={onClose} className="text-slate hover:text-ink shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap text-xs text-slate">
        <span className="px-2 py-0.5 rounded-full bg-cream">{diary.city}</span>
        {diary.school && <span>{diary.school}</span>}
        <span className="px-2 py-0.5 rounded-full bg-sage/10 text-sage">{LIFE_TYPE_LABELS[diary.lifeType]}</span>
        <span>{STAGE_LABELS[diary.stage]}</span>
      </div>
      <p className="text-sm text-slate leading-relaxed whitespace-pre-wrap mb-4">{diary.content}</p>
      <div className="flex items-center gap-1 text-amber text-sm mb-3">
        {"⭐".repeat(diary.rating)}
        <span className="text-slate text-xs ml-1">{diary.rating}/5</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate/60">
          {diary.anonymous ? "匿名" : diary.authorName}
        </span>
        <button
          onClick={() => onLike(diary.id)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-cream/60 hover:bg-cream text-slate hover:text-rust transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {diary.likes}
        </button>
      </div>
      <Link
        href={`/diary/${diary.id}`}
        className="inline-block mt-3 text-xs text-terracotta hover:underline"
      >
        查看完整日记 →
      </Link>
    </motion.div>
  );
}

export default function ExplorePage() {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [mounted, setMounted] = useState(false);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);

  useEffect(() => {
    setMounted(true);
    const userDiaries = loadDiaries();
    const all = [...userDiaries, ...MOCK_DIARIES];
    const ids = new Set<string>();
    const unique = all.filter((d) => {
      if (ids.has(d.id)) return false;
      ids.add(d.id);
      return true;
    });
    setDiaries(unique);

    const profile = loadUserProfile();
    if (profile?.targetCity) {
      const coords = getCoords(profile.targetCity);
      if (coords) setCenterCoords(coords);
    }
  }, []);

  const handleLike = (id: string) => {
    const updated = likeDiary(id);
    setSelectedDiary((prev) => {
      if (!prev || prev.id !== id) return prev;
      const found = updated.find((d) => d.id === id);
      return found ? { ...prev, likes: found.likes } : prev;
    });
  };

  const countries = Array.from(new Set(diaries.map((d) => d.country))).sort();
  const types = Array.from(new Set(diaries.map((d) => d.lifeType)));

  const filtered = diaries.filter((d) => {
    if (selectedCountry !== "all" && d.country !== selectedCountry) return false;
    if (selectedType !== "all" && d.lifeType !== selectedType) return false;
    return true;
  });

  if (!mounted) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left column */}
      <div className="w-[400px] shrink-0 overflow-y-auto border-r border-cream/50 bg-parchment">
        <div className="p-5">
          <h1 className="font-display text-2xl font-bold text-ink mb-1">
            全球探索
          </h1>
          <p className="text-sm text-slate mb-5">
            浏览来自世界各地的留学生真实经验
          </p>

          {/* Filters */}
          <div className="flex flex-col gap-2 mb-5">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-cream bg-white text-ink focus:outline-none focus:border-terracotta"
            >
              <option value="all">所有国家</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-cream bg-white text-ink focus:outline-none focus:border-terracotta"
            >
              <option value="all">所有类型</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {LIFE_TYPE_LABELS[t] || t}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate/60">
              共 {filtered.length} 个标记
            </span>
          </div>

          {/* Selected diary detail */}
          <AnimatePresence mode="wait">
            {selectedDiary ? (
              <DiaryDetailPanel
                key={selectedDiary.id}
                diary={selectedDiary}
                onLike={handleLike}
                onClose={() => setSelectedDiary(null)}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cream mx-auto mb-4">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <p className="text-sm text-slate/50">
                  点击地图上的标记<br />查看留学生经验分享
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Full-screen map */}
      <div className="flex-1 relative">
        <MapView
          diaries={filtered}
          centerLat={centerCoords?.lat}
          centerLng={centerCoords?.lng}
          minZoom={3}
          onMarkerClick={setSelectedDiary}
          selectedDiaryId={selectedDiary?.id ?? null}
        />
      </div>
    </div>
  );
}
