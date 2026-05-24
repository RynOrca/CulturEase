"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { DiaryEntry, LIFE_TYPE_LABELS, STAGE_LABELS, NodeCategory } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/types";
import { SEARCH_LOCATIONS, getProfileById, getFirstProfileByCityId } from "@/lib/data/intel";
import { MOCK_DIARIES } from "@/lib/data";
import { loadDiaries, loadUserProfile, likeDiary } from "@/lib/storage";
import { searchDiariesByCity } from "@/lib/search";
import { getCoords } from "@/lib/data/cities";
import SearchBar from "@/components/SearchBar";
import CategoryFilter from "@/components/CategoryFilter";
import StatusBar from "@/components/StatusBar";
import type { SearchLocation, PoiItem, PlaceProfile } from "@/lib/types";
import type { MapMode } from "@/components/RadarMap";

const DynamicRadarMap = dynamic(() => import("@/components/RadarMap"), { ssr: false });

function DiaryDetailPanel({ diary, onLike, onClose }: { diary: DiaryEntry; onLike: (id: string) => void; onClose: () => void }) {
  return (
    <div className="bg-white rounded-card shadow-card border border-cream/50 p-5 animate-[fadeIn_0.25s_ease-out]">
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
        <span className="text-xs text-slate/60">{diary.anonymous ? "匿名" : diary.authorName}</span>
        <button onClick={() => onLike(diary.id)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-cream/60 hover:bg-cream text-slate hover:text-rust transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {diary.likes}
        </button>
      </div>
      <Link href={`/diary/${diary.id}`} className="inline-block mt-3 text-xs text-terracotta hover:underline">
        查看完整日记 →
      </Link>
    </div>
  );
}

function IntelPoiDetail({ poi, profile, onDeselect }: { poi: PoiItem; profile: PlaceProfile; onDeselect: () => void }) {
  const catCfg = CATEGORY_CONFIG[poi.category];
  return (
    <div className="bg-white rounded-card shadow-card border border-cream/50 p-5 animate-[fadeIn_0.25s_ease-out]">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${catCfg.color}15`, color: catCfg.color }}>
          {catCfg.icon} {catCfg.label}
        </span>
        <button onClick={onDeselect} className="text-[10px] text-slate hover:text-ink">← 返回列表</button>
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">{poi.name}</h3>
      <p className="text-[11px] text-slate mb-2">{poi.nameEn}</p>
      <p className="text-xs text-slate leading-relaxed mb-3">{poi.summary}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {poi.tags.map((tag) => <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-cream text-slate">{tag}</span>)}
      </div>
      {poi.detail.highlights.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border-l-2 bg-sage/5 border-l-sage">
          <h4 className="text-[10px] uppercase tracking-wider text-sage font-semibold mb-1.5">亮点</h4>
          <ul className="space-y-1">{poi.detail.highlights.map((h, i) => <li key={i} className="text-xs text-slate flex items-start gap-1.5"><span className="text-sage mt-0.5">+</span>{h}</li>)}</ul>
        </div>
      )}
      {poi.detail.warnings.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border-l-2 bg-amber/5 border-l-amber">
          <h4 className="text-[10px] uppercase tracking-wider text-amber font-semibold mb-1.5">注意</h4>
          <ul className="space-y-1">{poi.detail.warnings.map((w, i) => <li key={i} className="text-xs text-slate flex items-start gap-1.5"><span className="text-amber mt-0.5">!</span>{w}</li>)}</ul>
        </div>
      )}
      {poi.detail.recommendation && (
        <div className="p-3 rounded-lg border border-cream bg-navy/5">
          <h4 className="text-[10px] uppercase tracking-wider text-navy font-semibold mb-1">建议</h4>
          <p className="text-xs text-slate leading-relaxed">{poi.detail.recommendation}</p>
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const [mode, setMode] = useState<MapMode>("intel");
  const [mounted, setMounted] = useState(false);

  // Diary state
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Intel state
  const [location, setLocation] = useState<SearchLocation>(SEARCH_LOCATIONS[0]);
  const [profile, setProfile] = useState<PlaceProfile | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<PoiItem | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<NodeCategory | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Fly-to state for external map navigation
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom: number }>();

  useEffect(() => {
    setMounted(true);
    const userDiaries = loadDiaries();
    const all = [...userDiaries, ...MOCK_DIARIES];
    const ids = new Set<string>();
    const unique = all.filter((d) => { if (ids.has(d.id)) return false; ids.add(d.id); return true; });
    setDiaries(unique);

    const savedProfile = loadUserProfile();
    if (savedProfile?.targetCity) {
      const coords = getCoords(savedProfile.targetCity);
      if (coords) setCenterCoords(coords);

      // Try to load intel profile for user's city
      const cityIdMap: Record<string, string> = { Tokyo: "tokyo", London: "london", Boston: "boston" };
      const cityId = cityIdMap[savedProfile.targetCity];
      if (cityId) {
        const prof = getFirstProfileByCityId(cityId);
        const loc = SEARCH_LOCATIONS.find((l) => l.cityId === cityId);
        if (prof && loc) { setProfile(prof); setLocation(loc); }
      }
    }
  }, []);

  const handleLike = (id: string) => {
    const updated = likeDiary(id);
    setDiaries((prev) => prev.map((d) => d.id === id ? { ...d, likes: updated.find((u) => u.id === id)?.likes ?? d.likes } : d));
    setSelectedDiary((prev) => prev?.id === id ? { ...prev, likes: (prev.likes || 0) + 1 } : prev);
  };

  const countries = Array.from(new Set(diaries.map((d) => d.country))).sort();
  const types = Array.from(new Set(diaries.map((d) => d.lifeType)));

  const filteredDiaries = diaries.filter((d) => {
    if (selectedCountry !== "all" && d.country !== selectedCountry) return false;
    if (selectedType !== "all" && d.lifeType !== selectedType) return false;
    return true;
  });

  // Intel handlers
  const handleSelectLocation = useCallback((loc: SearchLocation) => {
    const prof = getProfileById(loc.id) ?? getFirstProfileByCityId(loc.cityId) ?? null;
    setLocation(loc);
    setProfile(prof);
    setSelectedPoi(null);
    setActiveNodeId(null);
    setCategoryFilter(null);
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    if (!profile) return;
    const poi = profile.pois.find((p) => p.id === id);
    if (!poi) return;
    setSelectedPoi(poi);
    setActiveNodeId(id);
    setFlyToTarget({ lat: poi.lat, lng: poi.lng, zoom: 16 });
  }, [profile]);

  const handleNodeHover = useCallback((id: string | null) => {
    setHoveredNode(id ? (profile?.pois.find((p) => p.id === id)?.name ?? null) : null);
  }, [profile]);

  useEffect(() => {
    const handler = (e: Event) => {
      const poiId = (e as CustomEvent).detail as string;
      if (poiId && profile) {
        const poi = profile.pois.find((p) => p.id === poiId);
        if (poi) { setSelectedPoi(poi); setActiveNodeId(poiId); }
      }
    };
    window.addEventListener("poi-select", handler);
    return () => window.removeEventListener("poi-select", handler);
  }, [profile]);

  const nodeCounts: Record<NodeCategory, number> = { academic: 0, life: 0, housing: 0, forum: 0 };
  if (profile) for (const poi of profile.pois) nodeCounts[poi.category] = (nodeCounts[poi.category] || 0) + 1;

  if (!mounted) return null;

  const mapCenter = centerCoords || (profile ? { lat: profile.lat, lng: profile.lng } : undefined);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left panel */}
      <div className="w-[400px] shrink-0 overflow-y-auto border-r border-cream/50 bg-parchment">
        <div className="p-5">
          <h1 className="font-display text-2xl font-bold text-ink mb-1">全球探索</h1>
          <p className="text-sm text-slate mb-4">情报地图与留学生真实经验</p>

          {/* Mode toggle */}
          <div className="flex items-center rounded-lg border border-cream bg-white p-0.5 mb-4 shadow-sm">
            <button onClick={() => { setMode("intel"); setSelectedDiary(null); }}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-medium tracking-wider transition-all ${mode === "intel" ? "bg-terracotta text-white shadow-sm" : "text-slate hover:text-ink"}`}>
              情报地图
            </button>
            <button onClick={() => { setMode("diary"); setSelectedPoi(null); }}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-medium tracking-wider transition-all ${mode === "diary" ? "bg-terracotta text-white shadow-sm" : "text-slate hover:text-ink"}`}>
              日记地图
            </button>
          </div>

          {mode === "intel" && (
            <div className="space-y-3 mb-5">
              <SearchBar onSelectLocation={handleSelectLocation} currentLocation={location} />
              {profile && (
                <CategoryFilter activeFilter={categoryFilter} onFilterChange={setCategoryFilter} nodeCounts={nodeCounts} />
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowHeatmap(!showHeatmap)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium tracking-wider border transition-all ${showHeatmap ? "bg-rust/10 text-rust border-rust/20" : "bg-cream/60 text-slate border-cream hover:text-ink hover:bg-cream"}`}>
                  {showHeatmap ? "热力: ON" : "热力: OFF"}
                </button>
                <span className="text-[10px] text-slate">{profile ? `${profile.pois.length} 个情报点` : "选择学校查看情报"}</span>
              </div>
            </div>
          )}

          {mode === "diary" && (
            <div className="flex flex-col gap-2 mb-5">
              <select value={selectedCountry} onChange={(e) => {
                  const country = e.target.value;
                  setSelectedCountry(country);
                  if (country === "all") {
                    setFlyToTarget({ lat: 20, lng: 0, zoom: 3 });
                  } else {
                    const countryDiaries = diaries.filter((d) => d.country === country);
                    if (countryDiaries.length > 0) {
                      const avgLat = countryDiaries.reduce((s, d) => s + d.lat, 0) / countryDiaries.length;
                      const avgLng = countryDiaries.reduce((s, d) => s + d.lng, 0) / countryDiaries.length;
                      setFlyToTarget({ lat: avgLat, lng: avgLng, zoom: 5 });
                    }
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-cream bg-white text-ink focus:outline-none focus:border-terracotta">
                <option value="all">所有国家</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-cream bg-white text-ink focus:outline-none focus:border-terracotta">
                <option value="all">所有类型</option>
                {types.map((t) => <option key={t} value={t}>{LIFE_TYPE_LABELS[t] || t}</option>)}
              </select>
              <span className="text-xs text-slate/60">共 {filteredDiaries.length} 个标记</span>
            </div>
          )}

          {/* Detail panel */}
          {mode === "intel" && selectedPoi && profile && (
            <IntelPoiDetail poi={selectedPoi} profile={profile} onDeselect={() => { setSelectedPoi(null); setActiveNodeId(profile.id); }} />
          )}
          {mode === "intel" && !selectedPoi && profile && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-slate uppercase tracking-wider mb-2">情报点 ({profile.pois.length})</h3>
              {profile.pois.filter((p) => !categoryFilter || p.category === categoryFilter).map((poi) => (
                <div key={poi.id} onClick={() => handleNodeClick(poi.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-cream transition-colors cursor-pointer ${activeNodeId === poi.id ? "bg-white border-cream shadow-sm" : ""}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_CONFIG[poi.category].color }} />
                  <div className="flex-1 min-w-0"><div className="text-xs font-medium text-ink truncate">{poi.name}</div><div className="text-[10px] text-slate truncate">{poi.shortLabel}</div></div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${CATEGORY_CONFIG[poi.category].color}15`, color: CATEGORY_CONFIG[poi.category].color }}>{CATEGORY_CONFIG[poi.category].labelEn}</span>
                </div>
              ))}
            </div>
          )}
          {mode === "intel" && !profile && (
            <div className="text-center py-16">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cream mx-auto mb-4">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <p className="text-sm text-slate/50">搜索学校查看情报节点<br />点击节点查看详情</p>
            </div>
          )}

          {mode === "diary" && selectedDiary && (
            <DiaryDetailPanel diary={selectedDiary} onLike={handleLike} onClose={() => setSelectedDiary(null)} />
          )}
          {mode === "diary" && !selectedDiary && (
            <div className="text-center py-16">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cream mx-auto mb-4">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <p className="text-sm text-slate/50">点击地图上的标记<br />查看留学生经验分享</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Map */}
      <div className="flex-1 relative">
        <DynamicRadarMap
          location={location}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          activeNodeId={activeNodeId}
          categoryFilter={categoryFilter}
          pois={profile?.pois}
          heatZones={profile?.heatZones}
          showHeatmap={mode === "intel" && showHeatmap}
          mode={mode}
          flyToTarget={flyToTarget}
          diaries={mode === "diary" ? filteredDiaries : undefined}
          onDiaryClick={mode === "diary" ? (d) => setSelectedDiary(d) : undefined}
        />
        <div className="absolute bottom-0 left-0 right-0 z-[500]">
          <StatusBar location={location} totalNodes={mode === "intel" ? (profile?.pois.length ?? 0) : filteredDiaries.length} hoveredNode={hoveredNode} />
        </div>
      </div>
    </div>
  );
}
